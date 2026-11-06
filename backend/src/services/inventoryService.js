const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Core inventory ledger logic (req #10, #11, #39, #40, #48.3, #49).
 *
 * Design:
 *  - `Inventory` holds a cached running balance per product+warehouse for fast reads.
 *  - `InventoryTransaction` is the immutable ledger: every movement, ever, with a
 *    running balance snapshot, a reference and a source document.
 *  - Every function here MUST be called from inside a `prisma.$transaction(...)` so that
 *    the inventory update, the ledger row and the calling business transaction (sale,
 *    GRN, transfer, adjustment...) commit or roll back together (req #48.3 atomicity).
 *
 * Callers pass `tx` — the Prisma transaction client — never the bare `prisma` client,
 * except for read-only helpers.
 */

// Increases stock at a warehouse and writes the matching ledger row.
async function postStockIn(tx, { productId, warehouseId, quantity, txnType, reference, sourceType, sourceId, unitCost, userId, goodsReceiptId }) {
  if (quantity <= 0) throw new ApiError(400, 'Stock-in quantity must be positive');

  const inventory = await tx.inventory.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: { quantityOnHand: { increment: quantity } },
    create: { productId, warehouseId, quantityOnHand: quantity, quantityReserved: 0 },
  });

  const txn = await tx.inventoryTransaction.create({
    data: {
      productId,
      warehouseId,
      txnType,
      quantityIn: quantity,
      quantityOut: 0,
      balanceAfter: inventory.quantityOnHand,
      unitCost,
      reference,
      sourceType,
      sourceId,
      goodsReceiptId,
      userId,
    },
  });

  return { inventory, txn };
}

// Decreases stock at a warehouse and writes the matching ledger row.
// Enforces req #49 "never allow stock to go negative unless explicitly configured" —
// the caller supplies the product's `allowNegativeStock` flag.
async function postStockOut(tx, { productId, warehouseId, quantity, txnType, reference, sourceType, sourceId, userId, allowNegativeStock = false }) {
  if (quantity <= 0) throw new ApiError(400, 'Stock-out quantity must be positive');

  const existing = await tx.inventory.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });

  const currentQty = existing?.quantityOnHand ?? 0;
  if (!allowNegativeStock && currentQty - quantity < 0) {
    throw new ApiError(400, `Insufficient stock: available ${currentQty}, requested ${quantity}`, { productId, warehouseId, currentQty, requested: quantity });
  }

  const inventory = await tx.inventory.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: { quantityOnHand: { decrement: quantity } },
    create: { productId, warehouseId, quantityOnHand: -quantity, quantityReserved: 0 },
  });

  const txn = await tx.inventoryTransaction.create({
    data: {
      productId,
      warehouseId,
      txnType,
      quantityIn: 0,
      quantityOut: quantity,
      balanceAfter: inventory.quantityOnHand,
      reference,
      sourceType,
      sourceId,
      userId,
    },
  });

  return { inventory, txn };
}

// Controlled reversal (req #33): posts the opposite movement rather than deleting history.
async function reverseTransaction(tx, { originalTxnId, userId, reference }) {
  const original = await tx.inventoryTransaction.findUnique({ where: { id: originalTxnId } });
  if (!original) throw new ApiError(404, 'Original inventory transaction not found');

  const isReversingIn = original.quantityIn > 0;
  const quantity = isReversingIn ? original.quantityIn : original.quantityOut;

  const result = isReversingIn
    ? await postStockOut(tx, {
        productId: original.productId,
        warehouseId: original.warehouseId,
        quantity,
        txnType: 'REVERSAL',
        reference,
        sourceType: 'REVERSAL',
        sourceId: original.id,
        userId,
        allowNegativeStock: true,
      })
    : await postStockIn(tx, {
        productId: original.productId,
        warehouseId: original.warehouseId,
        quantity,
        txnType: 'REVERSAL',
        reference,
        sourceType: 'REVERSAL',
        sourceId: original.id,
        userId,
      });

  await tx.inventoryTransaction.update({
    where: { id: result.txn.id },
    data: { isReversal: true, reversedTxnId: original.id },
  });

  return result;
}

// Read-only helper: available = on hand - reserved (req #4.3 "Available Stock").
async function getAvailableStock(productId, warehouseId) {
  const inv = await prisma.inventory.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } });
  if (!inv) return 0;
  return inv.quantityOnHand - inv.quantityReserved;
}

module.exports = { postStockIn, postStockOut, reverseTransaction, getAvailableStock };
