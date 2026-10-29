// src/popup.jsx

import React, { useEffect, useState } from "react";
import {
  getTrelloCards,
  getCurrentMember,
  filterTrelloCards,
  openTrelloCard,
} from "./trello";
import "./styles.css";

const DEFAULT_FILTERS = [
  {
    id: "my-tasks",
    name: "My Tasks",
    icon: "👤",
    filters: {
      member: "me",
      dueDate: "any",
      labels: [],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
  {
    id: "due-week",
    name: "Due This Week",
    icon: "▣",
    filters: {
      member: "any",
      dueDate: "week",
      labels: [],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
  {
    id: "bugs",
    name: "Bugs",
    icon: "◇",
    filters: {
      member: "any",
      dueDate: "any",
      labels: ["Bug"],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
  {
    id: "high-priority",
    name: "High Priority",
    icon: "◇",
    filters: {
      member: "any",
      dueDate: "any",
      labels: ["High Priority"],
      cardType: "all",
      checklist: "any",
      attachment: "any",
      keyword: "",
      customFields: "any",
    },
  },
];

const EMPTY_FILTER = {
  member: "any",
  dueDate: "any",
  labels: [],
  cardType: "all",
  checklist: "any",
  attachment: "any",
  keyword: "",
  customFields: "any",
};

const LABELS = [
  "Bug",
  "High Priority",
  "Feature",
  "Design",
  "Documentation",
];

const OPTIONS = {
  member: [
    ["any", "Any member"],
    ["me", "Me"],
  ],
  dueDate: [
    ["any", "Any due date"],
    ["today", "Today"],
    ["week", "This week"],
    ["overdue", "Overdue"],
    ["month", "This month"],
    ["none", "No due date"],
  ],
  cardType: [
    ["all", "All cards"],
    ["open", "Open cards"],
    ["closed", "Archived cards"],
  ],
  checklist: [
    ["any", "Any"],
    ["complete", "Complete"],
    ["incomplete", "Incomplete"],
  ],
  attachment: [
    ["any", "Any"],
    ["yes", "Has attachment"],
    ["no", "No attachment"],
  ],
  customFields: [
    ["any", "Any"],
    ["complete", "Complete"],
    ["incomplete", "Incomplete"],
  ],
};

const STORAGE_KEY = "savedFilterViews";

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function description(filters = EMPTY_FILTER) {
  const parts = [];

  if (filters.member === "me") {
    parts.push("Members: Me");
  } else if (filters.member !== "any") {
    parts.push("Members: " + filters.member);
  }

  const due = {
    today: "Today",
    week: "This week",
    overdue: "Overdue",
    month: "This month",
    none: "No due date",
  };

  if (filters.dueDate !== "any") {
    parts.push(
      "Due date: " +
        (due[filters.dueDate] || filters.dueDate)
    );
  }

  if (filters.labels?.length) {
    parts.push("Labels: " + filters.labels.join(", "));
  }

  if (filters.cardType !== "all") {
    parts.push("Card type: " + filters.cardType);
  }

  if (filters.checklist !== "any") {
    parts.push("Checklist: " + filters.checklist);
  }

  if (filters.attachment !== "any") {
    parts.push("Attachment: " + filters.attachment);
  }

  if (filters.keyword?.trim()) {
    parts.push("Keyword: " + filters.keyword);
  }

  if (filters.customFields !== "any") {
    parts.push("Custom fields: " + filters.customFields);
  }

  return parts.length ? parts.join(" · ") : "All cards";
}

function Popup() {
  const [savedFilters, setSavedFilters] = useState([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [cards, setCards] = useState([]);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [filteredCards, setFilteredCards] = useState([]);
  const [modal, setModal] = useState(null);
  const [editingFilter, setEditingFilter] = useState(null);
  const [menuFilter, setMenuFilter] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    ...EMPTY_FILTER,
    labels: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSavedFilters() {
      try {
        const t = window.TrelloPowerUp.iframe();
        const saved = await t.get(
          "board",
          "shared",
          STORAGE_KEY
        );

        if (!cancelled) {
          setSavedFilters(
            Array.isArray(saved) ? saved : DEFAULT_FILTERS
          );
        }
      } catch (err) {
        console.error("Unable to load saved filters:", err);

        if (!cancelled) {
          setSavedFilters(DEFAULT_FILTERS);
        }
      } finally {
        if (!cancelled) {
          setFiltersLoaded(true);
        }
      }
    }

    async function loadCards() {
      try {
        const [trelloCards, member] = await Promise.all([
          getTrelloCards(),
          getCurrentMember(),
        ]);

        if (cancelled) return;

        setCards(Array.isArray(trelloCards) ? trelloCards : []);
        setCurrentMemberId(member?.id || "");

        console.log("Loaded Trello cards:", trelloCards);
        console.log("Loaded current member:", member);
      } catch (err) {
        console.error("Unable to load Trello cards:", err);

        if (!cancelled) {
          setCards([]);
          setCurrentMemberId("");
        }
      } finally {
        if (!cancelled) {
          setCardsLoaded(true);
        }
      }
    }

    loadSavedFilters();
    loadCards();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filtersLoaded) return;

    let cancelled = false;

    async function saveSavedFilters() {
      try {
        if (
          !window.TrelloPowerUp ||
          typeof window.TrelloPowerUp.iframe !== "function"
        ) {
          throw new Error("Trello Power-Up client is unavailable.");
        }

        const t = window.TrelloPowerUp.iframe();

        await t.set(
          "board",
          "shared",
          STORAGE_KEY,
          savedFilters
        );
      } catch (err) {
        if (!cancelled) {
          console.error("Unable to save filters:", err);
        }
      }
    }

    saveSavedFilters();

    return () => {
      cancelled = true;
    };
  }, [savedFilters, filtersLoaded]);

  useEffect(() => {
    function closeMenu() {
      setMenuFilter(null);
    }

    document.addEventListener("click", closeMenu);

    return () => {
      document.removeEventListener("click", closeMenu);
    };
  }, []);

  function openCreate() {
    setEditingFilter(null);
    setForm({
      name: "",
      ...EMPTY_FILTER,
      labels: [],
    });
    setError("");
    setMenuFilter(null);
    setModal("create");
  }

  function openEdit(filter) {
    setEditingFilter(filter);
    setForm({
      name: filter.name,
      ...EMPTY_FILTER,
      ...(filter.filters || {}),
      labels: [...(filter.filters?.labels || [])],
    });
    setError("");
    setMenuFilter(null);
    setModal("edit");
  }

  function openRename(filter) {
    setEditingFilter(filter);
    setForm({
      name: filter.name,
      ...EMPTY_FILTER,
      ...(filter.filters || {}),
      labels: [...(filter.filters?.labels || [])],
    });
    setError("");
    setMenuFilter(null);
    setModal("rename");
  }

  function closeModal() {
    setModal(null);
    setEditingFilter(null);
    setError("");
  }

  function update(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toggleLabel(label) {
    setForm((prev) => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter((item) => item !== label)
        : [...prev.labels, label],
    }));
  }

  function saveFilter() {
    const name = form.name.trim();

    if (!name) {
      setError("Please enter a filter name.");
      return;
    }

    const duplicate = savedFilters.some(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase() &&
        item.id !== editingFilter?.id
    );

    if (duplicate) {
      setError("A filter with this name already exists.");
      return;
    }

    const next = {
      id: editingFilter?.id || makeId(),
      name,
      icon: editingFilter?.icon || "◇",
      filters: {
        member: form.member,
        dueDate: form.dueDate,
        labels: [...form.labels],
        cardType: form.cardType,
        checklist: form.checklist,
        attachment: form.attachment,
        keyword: form.keyword,
        customFields: form.customFields,
      },
    };

    setSavedFilters((prev) =>
      editingFilter
        ? prev.map((item) =>
            item.id === editingFilter.id ? next : item
          )
        : [...prev, next]
    );

    closeModal();
  }

  function renameFilter() {
    const name = form.name.trim();

    if (!name) {
      setError("Please enter a filter name.");
      return;
    }

    const duplicate = savedFilters.some(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase() &&
        item.id !== editingFilter?.id
    );

    if (duplicate) {
      setError("A filter with this name already exists.");
      return;
    }

    setSavedFilters((prev) =>
      prev.map((item) =>
        item.id === editingFilter.id
          ? { ...item, name }
          : item
      )
    );

    closeModal();
  }

  function deleteFilter() {
    if (!editingFilter) return;

    setSavedFilters((prev) =>
      prev.filter((item) => item.id !== editingFilter.id)
    );

    if (activeFilter?.id === editingFilter.id) {
      setActiveFilter(null);
      setFilteredCards([]);
    }

    closeModal();
  }
  

  function selectFilter(savedView) {
    try {
      const filters = {
        ...EMPTY_FILTER,
        ...(savedView.filters || {}),
      };

      const result = filterTrelloCards(cards || [], {
        ...filters,
        currentMemberId,
      });

      setFilteredCards(Array.isArray(result) ? result : []);
      setSortBy("default");
      setActiveFilter(savedView);
      setMenuFilter(null);
      setError("");

      console.log("Selected filter:", savedView.name);
      console.log("Matching cards:", result);
    } catch (err) {
      console.error("Filter selection failed:", err);
      setError("Could not apply this filter.");
      setFilteredCards([]);
      setActiveFilter(savedView);
    }
  }

  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === "dueDate") {
      const dateA = a?.due
        ? new Date(a.due).getTime()
        : Infinity;
      const dateB = b?.due
        ? new Date(b.due).getTime()
        : Infinity;
      return dateA - dateB;
    }

    if (sortBy === "priority") {
      const getPriority = (card) => {
        const names = (card.labels || []).map((label) =>
          (label.name || "").toLowerCase()
        );

        if (names.some((name) => name.includes("high"))) return 1;
        if (names.some((name) => name.includes("medium"))) return 2;
        if (names.some((name) => name.includes("low"))) return 3;
        return 4;
      };

      return getPriority(a) - getPriority(b);
    }

    if (sortBy === "name") {
      return String(a.name || a.title || "").localeCompare(
        String(b.name || b.title || "")
      );
    }

    return 0;
  });

  function renderSelect(field, label) {
    return (
      <label className="filter-field" key={field}>
        <span className="field-label">{label}</span>

        <select
          value={form[field] ?? "any"}
          onChange={(event) => update(field, event.target.value)}
        >
          {OPTIONS[field].map(([value, text]) => (
            <option value={value} key={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const visibleFilters = savedFilters.filter((filter) =>
    String(filter.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!filtersLoaded || !cardsLoaded) {
    return (
      <div className="app">
        <div className="empty">Loading saved filters...</div>
      </div>
    );
  }

  return (
    <div className="app" onClick={() => setMenuFilter(null)}>
      <header className="header">
        <div className="header-title">
  <img
    className="header-icon"
    src="/images/saved-filter-logo.png"
    alt="Saved Filter Views"
  />
  <h1>Saved Filter Views</h1>
</div>
      </header>

      <main className="saved-list">
        <div className="list-header">
          <h3>Saved Filters</h3>
          <span className="filter-count">{savedFilters.length}</span>
        </div>

        <input
          className="search-input"
          type="search"
          placeholder="Search saved filters..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {visibleFilters.length === 0 ? (
          <div className="empty">No saved filters found.</div>
        ) : (
          visibleFilters.map((filter) => (
            <div
              className={
                "saved-item" +
                (activeFilter?.id === filter.id ? " active" : "")
              }
              key={filter.id}
            >
              <button
                type="button"
                className="saved-main"
                onClick={() => selectFilter(filter)}
              >
                <span className="saved-icon">
                  {filter.icon || "◇"}
                </span>

                <span className="saved-text">
                  <strong>{filter.name}</strong>
                  <small>{description(filter.filters)}</small>
                </span>
              </button>

              <div
                className="actions"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Filter options"
                  title="More options"
                  onClick={() =>
                    setMenuFilter(
                      menuFilter === filter.id ? null : filter.id
                    )
                  }
                >
                  ⋯
                </button>

                {menuFilter === filter.id && (
                  <div className="item-menu">
                    <button
                      type="button"
                      onClick={() => openEdit(filter)}
                    >
                      <span>✎</span> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => openRename(filter)}
                    >
                      <span>▧</span> Rename
                    </button>

                    <button
                      type="button"
                      className="delete-menu-item"
                      onClick={() => {
                        setEditingFilter(filter);
                        setMenuFilter(null);
                        setModal("delete");
                      }}
                    >
                      <span>⌫</span> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        <button
          type="button"
          className="create-button"
          onClick={openCreate}
        >
          <span>＋</span>
          Create a filter
        </button>

        {activeFilter && (
          <section className="active-filter">
            <div className="active-label">
              <span className="active-dot" />
              Active filter
            </div>

            <strong>{activeFilter.name}</strong>
            <p>{description(activeFilter.filters)}</p>

            <div className="filtered-results">
              <div className="filtered-results-header">
                <strong>Matching cards ({sortedCards.length})</strong>

               
              </div>


              {sortedCards.length === 0 ? (
                <p className="no-matching-cards">
                  No matching cards found for this filter.
                </p>
              ) : (
                <div className="filtered-card-list">
                  {sortedCards.map((card, index) => (
                    <button
                      type="button"
                      className="filtered-card"
                      key={card.id || card.shortLink || index}
                      onClick={() => {
                        if (card.id) openTrelloCard(card.id);
                      }}
                      title="Open card in Trello"
                    >
                      <span className="filtered-card-title">
                        {card.name || card.title || "Untitled card"}
                      </span>

                      {card.due && (
                        <small>
                          Due: {new Date(card.due).toLocaleDateString()}
                        </small>
                      )}

                      {(card.labels || []).length > 0 && (
                        <span className="filtered-card-labels">
                          {card.labels
                            .map((label) => label.name)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="clear-button"
              onClick={() => {
                setActiveFilter(null);
                setFilteredCards([]);
                setSortBy("default");
              }}
            >
              Clear filter
            </button>
          </section>
        )}
      </main>

      {modal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2>
                {modal === "create" && "Create a Filter"}
                {modal === "edit" && "Edit Saved View"}
                {modal === "rename" && "Rename Saved View"}
                {modal === "delete" && "Delete Saved View?"}
              </h2>

              <button
                type="button"
                className="icon-button"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {modal === "delete" ? (
              <div className="delete-modal">
                <div className="delete-icon">⌫</div>

                <p>
                  Delete <strong>{editingFilter?.name}</strong> permanently?
                </p>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={deleteFilter}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="subtitle">
                  {modal === "rename"
                    ? "Update the name of your saved view."
                    : "Set conditions and save this view for quick access."}
                </p>

                <label className="filter-field">
                  <span className="field-label">View Name *</span>

                  <input
                    autoFocus
                    value={form.name}
                    placeholder="Enter filter name"
                    onChange={(event) =>
                      update("name", event.target.value)
                    }
                  />
                </label>

                {modal !== "rename" && (
                  <div className="filter-settings">
                    <h3>Filter Settings</h3>

                    {renderSelect("member", "Members")}
                    {renderSelect("dueDate", "Due date")}

                    <div className="filter-field">
                      <span className="field-label">Labels</span>

                      <div className="label-options">
                        {LABELS.map((label) => (
                          <button
                            type="button"
                            key={label}
                            className={
                              "label-chip" +
                              (form.labels.includes(label)
                                ? " selected"
                                : "")
                            }
                            onClick={() => toggleLabel(label)}
                          >
                            {label}
                            {form.labels.includes(label) ? " ✓" : ""}
                          </button>
                        ))}
                      </div>
                    </div>

                    {renderSelect("cardType", "Card type")}
                    {renderSelect("checklist", "Checklist")}
                    {renderSelect("attachment", "Attachment")}

                    <label className="filter-field">
                      <span className="field-label">Keyword</span>

                      <input
                        value={form.keyword}
                        placeholder="Enter keyword"
                        onChange={(event) =>
                          update("keyword", event.target.value)
                        }
                      />
                    </label>

                    {renderSelect("customFields", "Custom fields")}
                  </div>
                )}

                {error && <div className="error">{error}</div>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      modal === "rename" ? renameFilter : saveFilter
                    }
                  >
                    {modal === "create" && "Save Filter"}
                    {modal === "edit" && "Update View"}
                    {modal === "rename" && "Rename"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Popup;