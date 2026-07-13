import sys

def replace_in_file(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. CustomerInquiryList.tsx
replace_in_file(
    r"c:\venora\apps\web\src\features\suppliers\ui\CustomerInquiryList.tsx",
    [
        ('href="/account/inquiries"', 'href="/bookings?view=suppliers"'),
        ('href={`/account/inquiries/${inquiry.id}`}', 'href={`/inquiries/${inquiry.id}`}'),
    ]
)

# 2. CustomerInquiryDetail.tsx
replace_in_file(
    r"c:\venora\apps\web\src\features\suppliers\ui\CustomerInquiryDetail.tsx",
    [
        ('href="/account/inquiries"', 'href="/bookings?view=suppliers"'),
    ]
)

# 3. SupplierContactForm.tsx
replace_in_file(
    r"c:\venora\apps\web\src\features\suppliers\ui\SupplierContactForm.tsx",
    [
        ('href="/account/inquiries"', 'href="/bookings?view=suppliers"'),
    ]
)

# 4. actions.ts
replace_in_file(
    r"c:\venora\apps\web\src\features\suppliers\application\actions.ts",
    [
        ('revalidatePath("/account/inquiries");', 'revalidatePath("/bookings");\n    revalidatePath("/inquiries");'),
        ('revalidatePath(`/account/inquiries/${data.inquiry_id}`);', 'revalidatePath(`/inquiries/${data.inquiry_id}`);'),
        ('revalidatePath(`/account/inquiries/${input.inquiryId}`);', 'revalidatePath(`/inquiries/${input.inquiryId}`);'),
    ]
)

# 5. nav-items.ts
# I need to see if it makes sense to just remove it or change it.
# Usually, we don't want "Inquiries" in account nav if it's in bookings now.
# Let's just point it to bookings?view=suppliers for now.
replace_in_file(
    r"c:\venora\apps\web\app\(customer)\account\_components\nav-items.ts",
    [
        ('href: "/account/inquiries",', 'href: "/bookings?view=suppliers",'),
    ]
)

print("Replaced all links successfully")
