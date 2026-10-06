import type { Metadata } from "next";
import { ArrowRight, Lock } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { StatusBadge } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "Navy", className: "bg-navy" },
  { name: "Brand / Indigo", className: "bg-brand" },
  { name: "Background", className: "bg-background" },
  { name: "Muted", className: "bg-muted" },
  { name: "Success", className: "bg-success" },
  { name: "Warning", className: "bg-warning" },
  { name: "Error", className: "bg-destructive" },
  { name: "Info", className: "bg-info" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t py-10">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-semibold">UniSolve design system</h1>
      <p className="mt-2 text-muted-foreground">Tokens and components used across the product.</p>

      <Section title="Logo">
        <div className="flex flex-wrap items-center gap-8">
          <Logo />
          <Logo markClassName="size-10" className="[&>span:last-child]:text-2xl" />
          <LogoMark className="size-16 rounded-2xl" />
          <LogoMark className="size-6" />
          <div className="rounded-xl bg-navy p-4">
            <span className="text-[1.15rem] font-semibold text-white">
              Uni<span className="text-brand">Solve</span>
            </span>
          </div>
        </div>
      </Section>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map((s) => (
            <div key={s.name} className="overflow-hidden rounded-xl border">
              <div className={`h-16 ${s.className}`} />
              <p className="px-3 py-2 text-xs font-medium">{s.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-3">
          <p className="text-5xl font-semibold tracking-tight">Stuck on something?</p>
          <p className="text-2xl font-medium text-muted-foreground">Your Problem. Our Expertise.</p>
          <p className="max-w-prose">
            Body text uses Inter. Get private, expert support for academics, coding, projects, research and career
            preparation.
          </p>
          <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">US-48291 · JetBrains Mono</code>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">
            Get It Solved <ArrowRight />
          </Button>
          <Button size="lg" variant="outline">
            Explore Services
          </Button>
          <Button>Primary</Button>
          <Button variant="navy">Navy</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Badges & status">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="brand">AI/ML</Badge>
          <Badge variant="outline">Python</Badge>
          <Badge variant="muted">Draft</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="info">Submitted</StatusBadge>
          <StatusBadge tone="brand" pulse>
            In progress
          </StatusBadge>
          <StatusBadge tone="warning">Payment pending</StatusBadge>
          <StatusBadge tone="success">Completed</StatusBadge>
          <StatusBadge tone="danger">Disputed</StatusBadge>
          <StatusBadge tone="muted">Cancelled</StatusBadge>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Active Requests</CardDescription>
              <CardTitle className="text-3xl">3</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Pending Payment</CardDescription>
              <CardTitle className="text-3xl">₹1,499</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Lock className="size-4" />
              </div>
              <CardTitle>Private by Design</CardTitle>
              <CardDescription>Your requests and files are handled privately.</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </div>
      </Section>

      <Section title="Form elements">
        <div className="grid max-w-xl gap-5">
          <div className="grid gap-2">
            <Label htmlFor="sg-email">Email</Label>
            <Input id="sg-email" type="email" placeholder="you@college.edu" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-invalid">With error</Label>
            <Input id="sg-invalid" aria-invalid defaultValue="not-an-email" />
            <p className="text-sm text-destructive">Enter a valid email address.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-desc">What do you need help with?</Label>
            <Textarea
              id="sg-desc"
              placeholder="Tell us what you're trying to do, what you've tried already, and where you're stuck."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox /> Keep my request anonymous
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch /> Email notifications
          </label>
        </div>
      </Section>
    </div>
  );
}
