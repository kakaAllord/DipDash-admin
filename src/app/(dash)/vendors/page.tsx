import { listVendorsWithMenu } from "@/lib/repo/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { tsh } from "@/lib/format";
import { CATEGORY_LABEL, type MenuCategory } from "@/lib/domain/catalog";
import { StockToggle } from "@/components/admin/StockToggle";

export default async function InventoryPage() {
  const vendors = await listVendorsWithMenu();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted">
          Toggle items in/out of stock — changes apply instantly across the
          student app.
        </p>
      </div>

      {vendors.map((v) => (
        <Card key={v.id} className="flex flex-col gap-1 p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">{v.name}</h2>
              <Badge tone={v.location === "in_campus" ? "primary" : "accent"}>
                {v.location === "in_campus" ? "In campus" : "Off campus"}
              </Badge>
            </div>
            <span className="text-xs text-muted">{v.items.length} items</span>
          </div>
          <ul>
            {v.items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0"
              >
                <div>
                  <p className="font-medium">{it.name}</p>
                  <p className="text-xs text-muted">
                    {CATEGORY_LABEL[it.category as MenuCategory]} · {tsh(it.priceTsh)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold ${
                      it.inStock ? "text-primary" : "text-danger"
                    }`}
                  >
                    {it.inStock ? "In stock" : "Out of stock"}
                  </span>
                  <StockToggle menuItemId={it.id} inStock={it.inStock} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
