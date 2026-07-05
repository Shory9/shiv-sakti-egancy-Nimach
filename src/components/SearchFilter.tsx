type SearchFilterProps = {
  search: string;
  setSearch: (value: string) => void;
};

function SearchFilter({ search, setSearch }: SearchFilterProps) {
  return (
    <div className="search-filter">
      <input
        type="text"
        placeholder="Search by Customer, Phone, Bank..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}

export default SearchFilter;