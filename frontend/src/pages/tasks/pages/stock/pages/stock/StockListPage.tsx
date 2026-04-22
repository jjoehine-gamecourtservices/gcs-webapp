// frontend/src/pages/tasks/pages/stock/pages/stock/StockListPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import "../../../../../../styles/stock.css";
import StockCard from "../../components/StockCard";
import StockDetailsPane from "../../components/StockDetailsPane";
import useStockItems from "../../state/useStockItems";

type Props = {
  onBack?: () => void;
};

type StockFilterOption = "all" | "with-vendors" | "without-vendors";

export default function StockListPage({ onBack }: Props) {
  const { items, loading, error } = useStockItems();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilterOption>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const hasActiveFilters = filter !== "all";

  const selectedFilterLabel = useMemo(() => {
    if (filter === "with-vendors") return "With Vendors";
    if (filter === "without-vendors") return "Without Vendors";
    return "All Items";
  }, [filter]);

  const filteredItems = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "with-vendors"
            ? item.vendors.length > 0
            : item.vendors.length === 0;

      const vendorText = item.vendors
        .map((vendor) => [vendor.name, vendor.phone, vendor.email, vendor.location].filter(Boolean).join(" "))
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchValue.length === 0
          ? true
          : item.name.toLowerCase().includes(searchValue) ||
            (item.size || "").toLowerCase().includes(searchValue) ||
            (item.modelNumber || "").toLowerCase().includes(searchValue) ||
            (item.picturePath || "").toLowerCase().includes(searchValue) ||
            vendorText.includes(searchValue);

      return matchesFilter && matchesSearch;
    });
  }, [items, search, filter]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedItemId(null);
      return;
    }

    const stillExists = filteredItems.some((item) => item.id === selectedItemId);
    if (!stillExists) {
      setSelectedItemId(filteredItems[0].id);
    }
  }, [filteredItems, selectedItemId]);

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
              <span>{selectedFilterLabel}</span>
              {hasActiveFilters ? <span aria-hidden="true" className="orderStockFilterActiveDot" /> : null}
            </button>

            {filtersOpen ? (
              <div className="orderStockFilterPopover">
                <div className="orderStockFilterPopoverTitle">Item Filter</div>

                <div className="orderStockFilterOptions">
                  <label className="orderStockFilterOption">
                    <input
                      type="checkbox"
                      checked={filter === "all"}
                      onChange={() => setFilter("all")}
                    />
                    <span>All Items</span>
                  </label>

                  <label className="orderStockFilterOption">
                    <input
                      type="checkbox"
                      checked={filter === "with-vendors"}
                      onChange={() => setFilter("with-vendors")}
                    />
                    <span>With Vendors</span>
                  </label>

                  <label className="orderStockFilterOption">
                    <input
                      type="checkbox"
                      checked={filter === "without-vendors"}
                      onChange={() => setFilter("without-vendors")}
                    />
                    <span>Without Vendors</span>
                  </label>
                </div>

                <div className="orderStockFilterFooter">
                  <div className="orderStockFilterFooterText">
                    {hasActiveFilters ? "1 active" : "No filters active"}
                  </div>

                  <button
                    className="dashBtn"
                    type="button"
                    onClick={() => setFilter("all")}
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
          {loading ? (
            <div className="dashMuted">Loading stock items...</div>
          ) : error ? (
            <div className="dashMuted">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="dashMuted">No stock items found.</div>
          ) : (
            <div className="orderStockCardsGrid">
              {filteredItems.map((item) => (
                <StockCard
                  key={item.id}
                  title={item.name}
                  type={item.size || item.modelNumber || "No size/model listed"}
                  selected={selectedItem?.id === item.id}
                  onClick={() => setSelectedItemId(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="orderStockDetailsPaneWrap">
          <StockDetailsPane item={selectedItem} />
        </div>
      </section>
    </section>
  );
}