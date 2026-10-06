import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { footerNav, siteConfig } from "@/lib/site";

const social = [
  { label: "Instagram", href: siteConfig.social.instagram },
  { label: "LinkedIn", href: siteConfig.social.linkedin },
  { label: "YouTube", href: siteConfig.social.youtube },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40 pb-24 lg:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{siteConfig.tagline}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Complete solutions, explained step by step. Students are responsible for following their college&apos;s rules.{" "}
            <Link href="/legal/academic-integrity" className="underline underline-offset-2 hover:text-foreground">
              Read our policy
            </Link>
            .
          </p>
        </div>

        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav aria-label="Social">
          <h2 className="text-sm font-semibold">Social</h2>
          <ul className="mt-3 space-y-2">
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 UniSolve. All rights reserved.</p>
          <p>Made for students, starting in Hyderabad.</p>
        </div>
      </div>
    </footer>
  );
}
