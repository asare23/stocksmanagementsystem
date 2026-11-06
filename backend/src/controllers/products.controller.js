const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { logAudit } = require("../services/auditService");

const include = {
  category: true,
  brand: true,
  unit: true,
  barcodes: true,
  vehicleCompatibility: {
    include: { vehicleModel: { include: { make: true } } },
  },
};

const list = asyncHandler(async (req, res) => {
  const { q, categoryId, brandId, status, page = 1, pageSize = 50 } = req.query;
  const where = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { partNumber: { contains: q, mode: "insensitive" } },
      { barcodes: { some: { barcode: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  if (status) where.status = status;

  const take = Math.min(Number(pageSize) || 50, 200);
  const skip = (Number(page) - 1) * take;
  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);
  res.json({ data, total, page: Number(page), pageSize: take });
});

const getOne = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { ...include, inventory: { include: { warehouse: true } } },
  });
  if (!product) throw new ApiError(404, "Product not found");
  res.json(product);
});

// Find by barcode or vehicle make/model/year, for POS scan-to-add and spare-parts search (req #24, #44).
const findByBarcode = asyncHandler(async (req, res) => {
  const barcode = req.params.barcode;
  const link = await prisma.productBarcode.findUnique({
    where: { barcode },
    include: { product: { include } },
  });
  if (!link) throw new ApiError(404, "No product found for that barcode");
  res.json(link.product);
});

const searchByVehicle = asyncHandler(async (req, res) => {
  const { make, model, year } = req.query;
  const where = {
    vehicleModel: {
      name: model ? { contains: model, mode: "insensitive" } : undefined,
      make: make
        ? { name: { contains: make, mode: "insensitive" } }
        : undefined,
    },
  };
  const yearNum = year ? Number(year) : undefined;
  const compats = await prisma.productVehicleCompatibility.findMany({
    where,
    include: {
      product: { include },
      vehicleModel: { include: { make: true } },
    },
  });
  const filtered = yearNum
    ? compats.filter(
        (c) =>
          (!c.yearFrom || c.yearFrom <= yearNum) &&
          (!c.yearTo || c.yearTo >= yearNum),
      )
    : compats;
  res.json({ data: filtered.map((c) => c.product) });
});

const create = asyncHandler(async (req, res) => {
  const { barcodes, vehicleCompatibility, ...data } = req.body;
  if (!data.sku || !data.name)
    throw new ApiError(400, "sku and name are required");

  const product = await prisma.product.create({
    data: {
      ...data,
      createdBy: req.user?.id,
      barcodes: barcodes?.length
        ? { create: barcodes.map((b) => ({ barcode: b })) }
        : undefined,
      vehicleCompatibility: vehicleCompatibility?.length
        ? { create: vehicleCompatibility.map((v) => ({ ...v })) }
        : undefined,
    },
    include,
  });
  await logAudit({
    userId: req.user?.id,
    action: "PRODUCT_CREATE",
    entityType: "Product",
    entityId: product.id,
    newValue: data,
  });
  res.status(201).json(product);
});

// req #27: price changes must be logged and historical prices retained, not silently overwritten.
const update = asyncHandler(async (req, res) => {
  const before = await prisma.product.findUnique({
    where: { id: req.params.id },
  });
  if (!before) throw new ApiError(404, "Product not found");

  const {
    barcodes,
    vehicleCompatibility,
    category,
    brand,
    unit,
    id,
    imageUrl,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    priceHistory,
    inventory,
    purchaseOrderItems,
    goodsReceiptItems,
    saleItems,
    customerReturnItems,
    supplierReturnItems,
    stockTransferItems,
    stockAdjustmentItems,
    stockCountItems,
    inventoryTransactions,
    batches,
    serials,
    ...data
  } = req.body;

  const priceFields = [
    ["costPrice", "COST"],
    ["sellingPrice", "SELLING"],
    ["wholesalePrice", "WHOLESALE"],
    ["minSellingPrice", "MIN_SELLING"],
  ];
  const priceHistoryCreates = [];
  for (const [field, priceType] of priceFields) {
    if (
      data[field] !== undefined &&
      data[field] !== null &&
      Number(data[field]) !== Number(before[field])
    ) {
      priceHistoryCreates.push({
        priceType,
        oldPrice: before[field] || 0,
        newPrice: data[field],
        changedBy: req.user?.id,
      });
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: req.params.id },
      data: { ...data, updatedBy: req.user?.id },
      include,
    });
    if (priceHistoryCreates.length) {
      await tx.productPriceHistory.createMany({
        data: priceHistoryCreates.map((p) => ({ ...p, productId: updated.id })),
      });
    }
    return updated;
  });

  await logAudit({
    userId: req.user?.id,
    action: "PRODUCT_UPDATE",
    entityType: "Product",
    entityId: product.id,
    oldValue: before,
    newValue: data,
  });
  res.json(product);
});

// Products should not be hard-deleted once they may have transactions (req #49) — deactivate instead.
const deactivate = asyncHandler(async (req, res) => {
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { status: "INACTIVE" },
  });
  await logAudit({
    userId: req.user?.id,
    action: "PRODUCT_DELETE",
    entityType: "Product",
    entityId: product.id,
  });
  res.status(204).send();
});

const priceHistory = asyncHandler(async (req, res) => {
  const history = await prisma.productPriceHistory.findMany({
    where: { productId: req.params.id },
    orderBy: { changedAt: "desc" },
  });
  res.json({ data: history });
});

const lowStock = asyncHandler(async (req, res) => {
  // Products whose total available stock across warehouses is at or below reorderLevel.
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { inventory: true },
  });
  const result = products
    .map((p) => {
      const total = p.inventory.reduce(
        (sum, i) => sum + i.quantityOnHand - i.quantityReserved,
        0,
      );
      return { ...p, availableStock: total };
    })
    .filter((p) => p.availableStock <= p.reorderLevel);
  res.json({ data: result });
});

module.exports = {
  list,
  getOne,
  findByBarcode,
  searchByVehicle,
  create,
  update,
  deactivate,
  priceHistory,
  lowStock,
};
