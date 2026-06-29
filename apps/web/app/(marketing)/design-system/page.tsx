"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Alert,
  AlertTitle,
  AlertDescription,
  Calendar,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@venora/ui";
import {
  Mail,
  Search,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  Info,
  CalendarDays,
  Sparkles,
} from "lucide-react";

export default function DesignSystemPage() {
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastVariant, setToastVariant] = React.useState<"success" | "destructive" | "warning" | "info">("success");
  const [toastMessage, setToastMessage] = React.useState({ title: "", description: "" });

  const triggerToast = (variant: typeof toastVariant, title: string, description: string) => {
    setToastVariant(variant);
    setToastMessage({ title, description });
    setToastOpen(true);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[var(--bg-subtle)] pb-20 pt-8">
        <div className="container space-y-12">
          {/* Hero Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3 w-3" />
              Venora UI v1.0
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] font-display sm:text-5xl">
              Design System Specification
            </h1>
            <p className="max-w-2xl text-base text-[var(--text-secondary)]">
              An enterprise-grade, Airbnb-inspired component suite tailored for Philippine wedding and event marketplaces. Implements strict WCAG AAA guidelines, fluid responsive registers, and clean CSS custom tokens.
            </p>
            <Separator variant="gradient" className="w-40 mt-6" />
          </div>

          <Tabs defaultValue="tokens" className="w-full">
            <TabsList className="mb-8 flex flex-wrap h-auto gap-2 bg-[var(--bg-muted)] p-1.5 rounded-xl">
              <TabsTrigger value="tokens">Design Tokens</TabsTrigger>
              <TabsTrigger value="components">Interactive Components</TabsTrigger>
              <TabsTrigger value="layouts">Tables & Grids</TabsTrigger>
            </TabsList>

            {/* DESIGN TOKENS TAB */}
            <TabsContent value="tokens" className="space-y-8">
              {/* Color System */}
              <Card>
                <CardHeader>
                  <CardTitle>Color Palette</CardTitle>
                  <CardDescription>
                    Brand-identifying color spaces. Swaps automatically between light and dark modes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {/* Capiz White */}
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 shadow-sm">
                    <div className="h-16 w-full rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)]" />
                    <div className="mt-2 text-xs">
                      <p className="font-semibold text-[var(--text-primary)]">Base Surface</p>
                      <p className="text-[var(--text-muted)]">var(--bg-base)</p>
                    </div>
                  </div>
                  {/* Brand Blue */}
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 shadow-sm">
                    <div className="h-16 w-full rounded-lg bg-[var(--color-brand-600)]" />
                    <div className="mt-2 text-xs">
                      <p className="font-semibold text-[var(--text-primary)]">Primary Brand Blue</p>
                      <p className="text-[var(--text-muted)]">var(--color-brand-600)</p>
                    </div>
                  </div>
                  {/* Golden Hour Accent */}
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 shadow-sm">
                    <div className="h-16 w-full rounded-lg bg-[var(--color-accent-500)]" />
                    <div className="mt-2 text-xs">
                      <p className="font-semibold text-[var(--text-primary)]">Golden Hour Accent</p>
                      <p className="text-[var(--text-muted)]">var(--color-accent-500)</p>
                    </div>
                  </div>
                  {/* Destructive Rust */}
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 shadow-sm">
                    <div className="h-16 w-full rounded-lg bg-[var(--color-danger)]" />
                    <div className="mt-2 text-xs">
                      <p className="font-semibold text-[var(--text-primary)]">Rust (Danger)</p>
                      <p className="text-[var(--text-muted)]">var(--color-danger)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography Scale */}
              <Card>
                <CardHeader>
                  <CardTitle>Typography System</CardTitle>
                  <CardDescription>
                    We load Sora for display headings and Inter for structured labels and body descriptions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--text-muted)]">Display XL (Sora)</p>
                    <h2 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] font-display">
                      Beautiful garden venues in Manila
                    </h2>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--text-muted)]">Heading M (Inter)</p>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      Exclusive Package Deals
                    </h3>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--text-muted)]">Body Standard</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Provide a brief description of the problem, any background context, and what the change accomplishes. Focus on clean scanability.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* INTERACTIVE COMPONENTS TAB */}
            <TabsContent value="components" className="space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                {/* Buttons Component Showcase */}
                <Card>
                  <CardHeader>
                    <CardTitle>Buttons</CardTitle>
                    <CardDescription>Actions and triggers across all semantic registers.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    <Button variant="default">Primary CTA</Button>
                    <Button variant="outline">Secondary outline</Button>
                    <Button variant="secondary">Muted trigger</Button>
                    <Button variant="destructive">Rust decline</Button>
                    <Button variant="ghost">Ghost link</Button>
                    <Button variant="default" isLoading>Processing</Button>
                  </CardContent>
                </Card>

                {/* Form Fields Component Showcase */}
                <Card>
                  <CardHeader>
                    <CardTitle>Inputs & Selection</CardTitle>
                    <CardDescription>Accessible interactive selectors with icon slots.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input label="Email address" placeholder="e.g. name@example.com" startIcon={<Mail />} />
                    <Input label="Search catalog" placeholder="Search venues..." startIcon={<Search />} />
                    <Input label="Username (Error State)" placeholder="user123" error="This username is already taken." />
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Select Role</label>
                      <Select defaultValue="customer">
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a profile type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="owner">Venue Owner</SelectItem>
                          <SelectItem value="coordinator">Event Coordinator</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Badges & Alerts */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Semantic Badges & Alerts</CardTitle>
                    <CardDescription>Banners showing success, danger, warning, or information.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="default">Default Blue</Badge>
                      <Badge variant="success">Confirmed</Badge>
                      <Badge variant="warning">Pending approval</Badge>
                      <Badge variant="destructive">Cancelled</Badge>
                      <Badge variant="info">Lagoon info</Badge>
                      <Badge variant="outline">Outline base</Badge>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Alert variant="success">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Action Successful</AlertTitle>
                        <AlertDescription>
                          The venue detail changes have been stored in the database.
                        </AlertDescription>
                      </Alert>
                      <Alert variant="destructive">
                        <XOctagon className="h-4 w-4" />
                        <AlertTitle>Access Denied</AlertTitle>
                        <AlertDescription>
                          You do not have the required permissions to suspend this booking.
                        </AlertDescription>
                      </Alert>
                      <Alert variant="warning">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Pending Invoice</AlertTitle>
                        <AlertDescription>
                          Please reconcile the commission fees before releasing the schedule.
                        </AlertDescription>
                      </Alert>
                      <Alert variant="info">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Beach Venues Category</AlertTitle>
                        <AlertDescription>
                          Filter includes outdoor/resort classifications in Cebu.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>

                {/* Modals & Toasts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Modals & Overlays</CardTitle>
                    <CardDescription>Radix-driven floating overlays.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">Open Alert Dialog</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Account Suspension</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to suspend this vendor account? This action will temporarily blackout all calendar slots.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="secondary">Cancel</Button>
                          </DialogClose>
                          <Button variant="destructive">Confirm Suspension</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="default"
                      onClick={() =>
                        triggerToast(
                          "success",
                          "Booking Approved",
                          "The reservation notification email has been dispatched successfully."
                        )
                      }
                    >
                      Trigger Toast Banner
                    </Button>
                  </CardContent>
                </Card>

                {/* Avatar Showcase */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Avatars</CardTitle>
                    <CardDescription>User profile images and fallback states.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80" />
                      <AvatarFallback>JT</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>AM</AvatarFallback>
                    </Avatar>
                    <div className="text-xs">
                      <p className="font-semibold text-[var(--text-primary)]">Jassim Trinidad</p>
                      <p className="text-[var(--text-muted)]">Event Organizer</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* LAYOUTS & DATA TAB */}
            <TabsContent value="layouts" className="space-y-8">
              {/* Calendar Selector & Table Grid */}
              <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Availability Calendar</CardTitle>
                    <CardDescription>
                      Tracks slot states for venues. Selected date will show a brand highlight ring.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Calendar
                      availability={{
                        "2026-06-15": "reserved",
                        "2026-06-16": "tentative",
                        "2026-06-20": "maintenance",
                        "2026-06-25": "blackout",
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Metrics Data Grid</CardTitle>
                    <CardDescription>
                      Scan-optimized data rows utilizing monospace digits formatting.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-mono text-xs">#VN-2026-901</TableCell>
                          <TableCell>Sophia Ramos</TableCell>
                          <TableCell className="font-mono">₱85,000.00</TableCell>
                          <TableCell>
                            <Badge variant="success">Confirmed</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">#VN-2026-902</TableCell>
                          <TableCell>Mateo Cruz</TableCell>
                          <TableCell className="font-mono">₱120,000.00</TableCell>
                          <TableCell>
                            <Badge variant="warning">Pending</Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono text-xs">#VN-2026-903</TableCell>
                          <TableCell>Alicia Santos</TableCell>
                          <TableCell className="font-mono">₱62,500.00</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Cancelled</Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Toast Notification Mount */}
      {toastOpen && (
        <Toast variant={toastVariant} onOpenChange={setToastOpen}>
          <div className="grid gap-1">
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      )}
      <ToastViewport />
    </ToastProvider>
  );
}
