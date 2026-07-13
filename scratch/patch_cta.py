import sys

file_path = r"c:\venora\apps\web\src\features\suppliers\ui\SupplierContactForm.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the state type
content = content.replace(
    'const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);',
    'const [status, setStatus] = useState<{ type: "success" | "error"; message: string; requestId?: string } | null>(null);'
)

# 2. Update the setStatus call on success
old_success_set_status = """      setStatus({
        type: "success",
        message:
          "Inquiry sent. The supplier can now follow up from their dashboard.",
      });"""
new_success_set_status = """      setStatus({
        type: "success",
        message:
          "Inquiry sent. The supplier can now follow up from their dashboard.",
        requestId: result.data?.requestId,
      });"""
content = content.replace(old_success_set_status, new_success_set_status)

# 3. Update the CTA link
old_cta_link = """          {status.type === "success" ? (
            <Link
              href="/bookings?view=suppliers"
              className="mt-2 inline-flex font-black text-emerald-800 underline-offset-4 hover:underline"
            >
              View Supplier Inquiries
            </Link>
          ) : null}"""
new_cta_link = """          {status.type === "success" ? (
            <Link
              href={status.requestId ? `/inquiries/${status.requestId}` : "/bookings?view=suppliers"}
              className="mt-2 inline-flex font-black text-emerald-800 underline-offset-4 hover:underline"
            >
              View Inquiry
            </Link>
          ) : null}"""
content = content.replace(old_cta_link, new_cta_link)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched SupplierContactForm CTA successfully")
