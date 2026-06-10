import type { Locale } from "@/i18n/locales";
import type { LegalDocument } from "./content";

interface LegalPageProps {
  locale: Locale;
  document: LegalDocument;
  canonicalPath: string;
}

export function LegalPage({ locale, document, canonicalPath }: LegalPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-16 print:py-6">
      {/* Header */}
      <header className="mb-10 border-b border-border pb-6 print:mb-6 print:border-neutral-300">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl print:text-2xl">
          {document.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground print:text-neutral-600">
          <span>
            {locale === "tk"
              ? "Güýje giriş senesi:"
              : locale === "ru"
                ? "Дата вступления в силу:"
                : "Effective date:"}{" "}
            <time dateTime="2026-06-10">{document.effectiveDate}</time>
          </span>
          <span>
            {locale === "tk"
              ? "Soňky üýtgetme:"
              : locale === "ru"
                ? "Последнее изменение:"
                : "Last revised:"}{" "}
            <time dateTime="2026-06-10">{document.lastRevised}</time>
          </span>
        </div>
      </header>

      {/* Sections */}
      <article className="space-y-8 print:space-y-5">
        {document.sections.map((section, index) => (
          <section key={index} className="print:break-inside-avoid">
            <h2 className="text-xl font-semibold text-foreground md:text-2xl print:text-lg">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-base leading-relaxed text-foreground/90 print:text-sm">
              {section.body.split("\n\n").map((paragraph, pIndex) => {
                const lines = paragraph.split("\n");
                const isList = lines.some((l) => l.trim().startsWith("- "));

                if (isList) {
                  return (
                    <ul key={pIndex} className="list-disc space-y-1.5 pl-5">
                      {lines.map((line, lIndex) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("- ")) {
                          const text = trimmed.slice(2);
                          return (
                            <li key={lIndex}>
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: text
                                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                                    .replace(/`([^`]+)`/g, "<code>$1</code>"),
                                }}
                              />
                            </li>
                          );
                        }
                        if (trimmed) {
                          return (
                            <li key={lIndex} className="list-none pl-0">
                              {trimmed}
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  );
                }

                return (
                  <p
                    key={pIndex}
                    dangerouslySetInnerHTML={{
                      __html: paragraph
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/`([^`]+)`/g, "<code>$1</code>"),
                    }}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </article>

      {/* Footer */}
      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground print:mt-8 print:border-neutral-300 print:text-neutral-600">
        <p>
          {locale === "tk"
            ? "Bu resmi resminama. Çap üçin: Ctrl+P (ýa-da Cmd+P)."
            : locale === "ru"
              ? "Это официальный документ. Для печати: Ctrl+P (или Cmd+P)."
              : "This is an official document. To print: Ctrl+P (or Cmd+P)."}
        </p>
        <p className="mt-1">
          {locale === "tk"
            ? "Häzirki wersiýa: "
            : locale === "ru"
              ? "Текущая версия: "
              : "Current version: "}
          <a
            href={`https://auto.tm/${locale}${canonicalPath}`}
            className="underline print:no-underline"
          >
            {`https://auto.tm/${locale}${canonicalPath}`}
          </a>
        </p>
      </footer>
    </main>
  );
}
