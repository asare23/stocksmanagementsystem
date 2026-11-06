import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS = [
  {
    label: "Discover",
    items: [
      { to: "/", label: "Dashboard", icon: "▦", perm: null },
      { to: "/warehouses", label: "Stores", icon: "◇", perm: "USER_MANAGE" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/products", label: "Products", icon: "▣", perm: "STOCK_VIEW" },
      {
        to: "/categories",
        label: "Categories",
        icon: "⌘",
        perm: "PRODUCT_UPDATE",
      },
      {
        to: "/suppliers",
        label: "Suppliers",
        icon: "◫",
        perm: "PURCHASE_CREATE",
      },
      {
        to: "/inventory",
        label: "Stock Levels",
        icon: "▤",
        perm: "STOCK_VIEW",
      },
      {
        to: "/stock-transfers",
        label: "Transfers",
        icon: "⇄",
        perm: "STOCK_TRANSFER",
      },
      {
        to: "/stock-adjustments",
        label: "Adjustments",
        icon: "↔",
        perm: "STOCK_ADJUST",
      },
      {
        to: "/stock-counts",
        label: "Stock Counts",
        icon: "✓",
        perm: "STOCK_ADJUST",
      },
    ],
  },
  {
    label: "Sales & Purchasing",
    items: [
      {
        to: "/purchase-orders",
        label: "Purchase Orders",
        icon: "▱",
        perm: "PURCHASE_CREATE",
      },
      {
        to: "/goods-receipts",
        label: "Goods Receipts",
        icon: "▤",
        perm: "STOCK_RECEIVE",
      },
      { to: "/customers", label: "Customers", icon: "♙", perm: "SALES_CREATE" },
      { to: "/pos", label: "POS / Sales", icon: "▰", perm: "SALES_CREATE" },
      { to: "/sales", label: "Sales History", icon: "↗", perm: "SALES_CREATE" },
      { to: "/returns", label: "Returns", icon: "↩", perm: "SALES_RETURN" },
      { to: "/reports", label: "Reports", icon: "▥", perm: "REPORT_VIEW" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/users", label: "Users & Roles", icon: "◎", perm: "USER_MANAGE" },
      { to: "/audit-log", label: "Audit Log", icon: "≡", perm: "REPORT_VIEW" },
    ],
  },
];

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.perm || hasPermission(item.perm)),
  })).filter((group) => group.items.length);

  const sidebar = (
    <aside className="flex h-full w-[256px] shrink-0 flex-col border-r border-black/30 bg-[#111315] text-gray-100 md:h-screen">
      <div className="flex h-[64px] items-center justify-between border-b border-white/[0.06] px-5">
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-lime-300 text-gray-950 shadow-[0_0_22px_rgba(190,242,100,0.16)]"
            aria-label="Axle"
          >
            <span className="absolute inset-[7px] rounded-full border-[1.5px] border-gray-950" />
            <span className="absolute left-[7px] right-[7px] top-1/2 border-t-[1.5px] border-gray-950" />
            <span className="absolute h-[7px] w-[7px] rounded-full border-[1.5px] border-gray-950 bg-lime-300" />
          </div>
          <div>
            <div className="text-[15px] font-bold leading-none tracking-wide">
              Axle
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-gray-500">
              Stock Management
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="text-2xl leading-none text-gray-400 md:hidden"
          aria-label="Close navigation"
        >
          &times;
        </button>
      </div>

      <nav className="flex-1 overflow-hidden px-3 py-2 scrollbar-thin">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex ? "mt-2.5" : ""}>
            <div className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-600">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex h-[30px] items-center gap-3 rounded-md px-3 text-[12px] transition-colors ${
                      isActive
                        ? "bg-white/[0.07] font-medium text-white"
                        : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute right-0 h-5 w-0.5 rounded-l bg-lime-300" />
                      )}
                      <span
                        className={`flex w-4 items-center justify-center text-sm ${isActive ? "text-lime-300" : "text-gray-500 group-hover:text-gray-300"}`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-2">
        <div className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-600">
          Account
        </div>
        <div className="flex items-center gap-3 rounded-md px-3 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-300 text-xs font-bold text-gray-950">
            {(user?.fullName || "U")
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-gray-200">
              {user?.fullName}
            </div>
            <div className="truncate text-[10px] text-gray-500">
              {user?.role?.replace(/_/g, " ")}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-gray-400 hover:bg-white/[0.05] hover:text-red-300"
            title="Log out"
            aria-label="Log out"
          >
            <span aria-hidden="true" className="text-sm">
              ⏻
            </span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden md:block shrink-0">{sidebar}</div>
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">{sidebar}</div>
        </div>
      )}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-gray-200 bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="mr-3 rounded border border-gray-300 px-2.5 py-1 text-lg leading-none"
            aria-label="Open navigation"
          >
            &#9776;
          </button>
          <span className="font-semibold">SMS</span>
        </header>
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
