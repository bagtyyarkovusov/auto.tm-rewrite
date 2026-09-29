import Link from "next/link";

const LINKS = [
  { href: "/reports", label: "Жалобы" },
  { href: "/reports/inspection-interests", label: "Интерес к проверкам" },
  { href: "/catalog/brands", label: "Бренды" },
  { href: "/audit", label: "Аудит" },
];

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-4 border-b px-6 py-3 text-sm md:px-8">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="text-neutral-600 hover:text-neutral-900">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
