import React, { useMemo, useState } from "react";
import "../../../../../../styles/stock.css";
import StockCard from "../../components/StockCard";
import StockDetailsPane from "../../components/StockDetailsPane";

type Props = {
  onBack?: () => void;
};

type StockTypeOption = "all" | "fasteners" | "anchors" | "hardware" | "padding" | "misc";

type StockItem = {
  id: string;
  name: string;
  type: Exclude<StockTypeOption, "all">;
  description: string;
  vendorOptions: string[];
};

const TYPE_OPTIONS: Array<{ value: Exclude<StockTypeOption, "all">; label: string }> = [
  { value: "fasteners", label: "Fasteners" },
  { value: "anchors", label: "Anchors" },
  { value: "hardware", label: "Hardware" },
  { value: "padding", label: "Padding" },
  { value: "misc", label: "Misc" },
];

const DUMMY_ITEMS: StockItem[] = [
  {
    id: "1",
    name: "Tapcon Screws",
    type: "fasteners",
    description: "Concrete screw fastener used for wall pad backing, brackets, and accessory mounting.",
    vendorOptions: ["White Cap", "Fastenal", "Home Depot"],
  },
  {
    id: "2",
    name: "Wedge Anchors",
    type: "anchors",
    description: "Heavy-duty anchors for concrete slab and block wall mounting conditions.",
    vendorOptions: ["White Cap", "Grainger"],
  },
  {
    id: "3",
    name: "Lag Bolts",
    type: "hardware",
    description: "Structural lag bolts used for wood backing and heavier hardware attachment points.",
    vendorOptions: ["Fastenal", "Grainger"],
  },
  {
    id: "4",
    name: "Black Wall Pad Vinyl",
    type: "padding",
    description: "Black vinyl facing material for wall pad fabrication and repairs.",
    vendorOptions: ["DGS", "Wall Pad Direct"],
  },
  {
    id: "5",
    name: "Concrete Screws",
    type: "fasteners",
    description: "General concrete screw stock for light and medium mounting use cases.",
    vendorOptions: ["White Cap", "Fastenal"],
  },
  {
    id: "6",
    name: "Sleeve Anchors",
    type: "anchors",
    description: "Expansion anchor option for masonry and concrete applications.",
    vendorOptions: ["Grainger", "Fastenal"],
  },
  {
    id: "7",
    name: "Washers",
    type: "hardware",
    description: "Flat washers for general fastening assemblies and bracket stacks.",
    vendorOptions: ["Fastenal", "Home Depot"],
  },
  {
    id: "8",
    name: "Misc Clips",
    type: "misc",
    description: "General-use clip stock for trim, netting, and accessory retention points.",
    vendorOptions: ["Amazon Business", "Grainger"],
  },
  {
    id: "9",
    name: "Foam Inserts",
    type: "padding",
    description: "Foam replacement inserts for wall pad repairs and specialty padding work.",
    vendorOptions: ["DGS", "Wall Pad Direct"],
  },
];

export default function OrderStockPage({ onBack }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StockTypeOption>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>(DUMMY_ITEMS[0]?.id ?? "");

  const hasActiveFilters = typeFilter !== "all";

  const selectedTypeLabel = useMemo(() => {
    if (typeFilter === "all") return "All Types";
    return TYPE_OPTIONS.find((option) => option.value === typeFilter)?.label ?? "All Types";
  }, [typeFilter]);

  const filteredItems = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return DUMMY_ITEMS.filter((item) => {
      const matchesType = typeFilter === "all" ? true : item.type === typeFilter;
      const matchesSearch =
        searchValue.length === 0
          ? true
          : item.name.toLowerCase().includes(searchValue) ||
            item.description.toLowerCase().includes(searchValue);

      return matchesType && matchesSearch;
    });
  }, [search, typeFilter]);

  const selectedItem = useMemo(() => {
    return filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null;
  }, [filteredItems, selectedItemId]);

  return (
    <section className="tasksWorkspace orderStockPage">
      <div className="dashCard orderStockToolbar">
        <div className="orderStockToolbarLeft">
          <button
            type="button"
            className="dashMiniPill"
            onClick={() => {
              if (onBack) onBack();
            }}
            style={{ cursor: "pointer" }}
            title="Back"
          >
            Back
          </button>

          <button
            type="button"
            className="dashMiniPill"
            style={{ cursor: "pointer" }}
            title="Add Item"
          >
            Add Item
          </button>
        </div>

        <div className="orderStockToolbarRight">
          <input
            type="text"
            className="dashInput orderStockSearch"
            placeholder="Search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ position: "relative" }}>
            <button
              className="dashMiniPill jobsActionButton orderStockFilterButton"
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-label="Filters"
              style={{
                position: "relative",
                paddingRight: hasActiveFilters ? 28 : undefined,
              }}
            >
              <span>{selectedTypeLabel}</span>
              {hasActiveFilters ? <span aria-hidden="true" className="orderStockFilterActiveDot" /> : null}
            </button>

            {filtersOpen ? (
              <div className="orderStockFilterPopover">
                <div className="orderStockFilterPopoverTitle">Type Filter</div>

                <div className="orderStockFilterOptions">
                  <label className="orderStockFilterOption">
                    <input
                      type="checkbox"
                      checked={typeFilter === "all"}
                      onChange={() => setTypeFilter("all")}
                    />
                    <span>All Types</span>
                  </label>

                  {TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="orderStockFilterOption">
                      <input
                        type="checkbox"
                        checked={typeFilter === option.value}
                        onChange={() => setTypeFilter(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                <div className="orderStockFilterFooter">
                  <div className="orderStockFilterFooterText">
                    {hasActiveFilters ? "1 active" : "No filters active"}
                  </div>

                  <button
                    className="dashBtn"
                    type="button"
                    onClick={() => setTypeFilter("all")}
                    disabled={!hasActiveFilters}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="orderStockContent">
        <div className="orderStockCardsPane">
          <div className="orderStockCardsGrid">
            {filteredItems.map((item) => (
              <StockCard
                key={item.id}
                title={item.name}
                type={item.type}
                selected={selectedItem?.id === item.id}
                onClick={() => setSelectedItemId(item.id)}
              />
            ))}
          </div>
        </div>

        <div className="orderStockDetailsPaneWrap">
          <StockDetailsPane item={selectedItem} />
        </div>
      </section>
    </section>
  );
}