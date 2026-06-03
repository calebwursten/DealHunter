import Header from "@/components/Header";
import PropertySearch from "@/components/PropertySearch";

export default function PropertiesPage() {
  return (
    <div>
      <Header
        title="Property Search"
        subtitle="Live Allegheny County data · 140,000+ properties"
      />
      <div className="p-4 md:p-8">
        <PropertySearch />
      </div>
    </div>
  );
}
