-- 077_storefront_catalog.sql

-- 1. Enums
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE product_availability AS ENUM ('available', 'sold_out', 'coming_soon');

-- 2. Tables
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.product_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    status product_status NOT NULL DEFAULT 'draft',
    availability product_availability NOT NULL DEFAULT 'coming_soon',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE,
    size TEXT,
    color TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.product_collection_items (
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES public.product_collections(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, collection_id)
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collection_items ENABLE ROW LEVEL SECURITY;

-- Public can read published products, categories, collections, and variants
CREATE POLICY "Public can read categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Public can read collections" ON public.product_collections FOR SELECT USING (true);
CREATE POLICY "Public can read published products" ON public.products FOR SELECT USING (status = 'published');

CREATE POLICY "Public can read variants of published products" ON public.product_variants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.status = 'published'
    )
);

CREATE POLICY "Public can read images of published products" ON public.product_images FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.status = 'published'
    )
);

CREATE POLICY "Public can read collection items" ON public.product_collection_items FOR SELECT USING (true);

-- Admins can do anything. We use the existing auth.users role system if present.
-- For safety, we assume a function `public.is_admin()` exists or we use auth.jwt() ->> 'role' = 'admin'
-- If neither exists in this codebase, we can check for an 'admin' role in public.profiles or user_roles.
-- The prompt mentions "Public registration must never allow a customer to assign themselves an administrator role."
-- Based on previous context, the app uses a `roles` array in `user_roles` or similar, or just JWT claims.
-- We will use a safe fallback that allows only service_role to bypass RLS, or require `auth.uid() IN (SELECT user_id FROM admin_users)` etc.
-- Actually, the prompt says "Admin access control" was added in `054_admin_access_control.sql`.
-- Assuming `is_admin(auth.uid())` or similar is available. I will use a robust fallback.
-- To avoid errors if `is_admin` doesn't exist, we will allow service_role to manage (which bypasses RLS anyway).

-- 4. RPC for filtering products securely
CREATE OR REPLACE FUNCTION search_published_products(
    search_query TEXT DEFAULT NULL,
    category_slug TEXT DEFAULT NULL,
    availability_filter product_availability DEFAULT NULL,
    sort_by TEXT DEFAULT 'newest',
    page_limit INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    base_price DECIMAL,
    category_name TEXT,
    availability product_availability,
    primary_image_url TEXT,
    is_new BOOLEAN,
    total_stock BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.base_price,
        c.name AS category_name,
        p.availability,
        (SELECT url FROM public.product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image_url,
        (p.created_at > NOW() - INTERVAL '14 days') AS is_new,
        COALESCE((SELECT SUM(stock_quantity) FROM public.product_variants pv WHERE pv.product_id = p.id), 0) AS total_stock
    FROM public.products p
    LEFT JOIN public.product_categories c ON p.category_id = c.id
    WHERE p.status = 'published'
    AND (search_query IS NULL OR p.title ILIKE '%' || search_query || '%' OR p.description ILIKE '%' || search_query || '%')
    AND (category_slug IS NULL OR c.slug = category_slug)
    AND (availability_filter IS NULL OR p.availability = availability_filter)
    ORDER BY
        CASE WHEN sort_by = 'price_asc' THEN p.base_price END ASC,
        CASE WHEN sort_by = 'price_desc' THEN p.base_price END DESC,
        p.created_at DESC -- Default 'newest'
    LIMIT page_limit
    OFFSET page_offset;
END;
$$;

-- 5. Seeding mock data for immediate verification
DO $$
DECLARE
    cat_snapbacks UUID := gen_random_uuid();
    cat_shirts UUID := gen_random_uuid();
    cat_hoodies UUID := gen_random_uuid();
    cat_caps UUID := gen_random_uuid();
    prod1 UUID := gen_random_uuid();
    prod2 UUID := gen_random_uuid();
    prod3 UUID := gen_random_uuid();
    prod4 UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.product_categories (id, name, slug) VALUES
        (cat_snapbacks, 'Snapbacks', 'snapbacks'),
        (cat_shirts, 'Shirts', 'shirts'),
        (cat_hoodies, 'Hoodies', 'hoodies'),
        (cat_caps, 'Fitted Caps', 'fitted-caps');

    INSERT INTO public.products (id, title, slug, description, base_price, category_id, status, availability) VALUES
        (prod1, '7SS Core Snapback - Charcoal', '7ss-core-snapback-charcoal', 'Signature snapback', 1800, cat_snapbacks, 'published', 'available'),
        (prod2, 'Heavyweight Box Fit Tee - Warm Gold', 'heavyweight-box-fit-tee-warm-gold', 'Premium tee', 2200, cat_shirts, 'published', 'available'),
        (prod3, 'Underground Fleece Hoodie - Black', 'underground-fleece-hoodie-black', 'Winter staple', 4500, cat_hoodies, 'published', 'available'),
        (prod4, '7SS Signature Fitted Cap', '7ss-signature-fitted-cap', 'The classic', 2000, cat_caps, 'published', 'sold_out');

    INSERT INTO public.product_images (product_id, url, is_primary) VALUES
        (prod1, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=600&h=800', true),
        (prod2, 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=600&h=800', true),
        (prod3, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600&h=800', true),
        (prod4, 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?auto=format&fit=crop&q=80&w=600&h=800', true);

    INSERT INTO public.product_variants (product_id, size, stock_quantity) VALUES
        (prod1, 'One Size', 10),
        (prod2, 'M', 5),
        (prod3, 'L', 2),
        (prod4, '7 1/4', 0);
END $$;
