--
-- PostgreSQL database dump
--

\restrict mLBET2iASb32TZRBpDPQLBDsjTA261MR36dLr7xiZeInr9Ff4hA70h1hCfWgKx7

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-26 17:01:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 18515)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5588 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 1017 (class 1247 OID 18584)
-- Name: transaction_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transaction_type_enum AS ENUM (
    'payment',
    'refund',
    'payout',
    'adjustment',
    'order_payment'
);


ALTER TYPE public.transaction_type_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 17802)
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    address_id uuid NOT NULL,
    customer_id uuid,
    seller_id uuid,
    full_name character varying(255),
    phone character varying(20),
    address_line_1 text,
    address_line_2 text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    is_default boolean DEFAULT false,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    country character varying(100)
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 19290)
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_settings (
    setting_id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_settings OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17823)
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    admin_id uuid NOT NULL,
    name character varying(255),
    email character varying(255),
    password_hash text,
    role character varying(50),
    permissions jsonb,
    is_active boolean DEFAULT true,
    last_login_at timestamp without time zone,
    created_by_admin uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- TOC entry 224_2 (class 1259 OID 17823_2)
-- Name: super_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admins (
    super_admin_id uuid NOT NULL,
    name character varying(255),
    email character varying(255),
    password_hash text,
    role character varying(50),
    permissions jsonb,
    is_active boolean DEFAULT true,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.super_admins OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 18742)
-- Name: annual_finances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.annual_finances (
    annual_finance_id uuid DEFAULT gen_random_uuid() NOT NULL,
    half_yearly_finance_id uuid,
    seller_id uuid,
    year integer NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0.00,
    platform_commission numeric(12,2) DEFAULT 0.00,
    net_seller_earnings numeric(12,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.annual_finances OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17841)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    audit_id uuid NOT NULL,
    admin_id uuid,
    table_name character varying(100),
    record_id uuid,
    action character varying(50),
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17855)
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_sessions (
    session_id uuid NOT NULL,
    user_type character varying(50) NOT NULL,
    user_ref_id uuid NOT NULL,
    token_hash text NOT NULL,
    device_info jsonb,
    ip_address inet,
    is_blacklisted boolean DEFAULT false,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sudo_verified_at timestamp without time zone,
    user_profile jsonb DEFAULT '{}'::jsonb,
    last_ip inet,
    last_device jsonb
);


ALTER TABLE public.auth_sessions OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17870)
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    bank_account_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    owner_type character varying(50) NOT NULL,
    account_number character varying(100) NOT NULL,
    upi_id character varying(100),
    bank_name character varying(255),
    ifsc_code character varying(50),
    account_type character varying(50),
    verification_status character varying(50) DEFAULT 'Pending'::character varying,
    verified_at timestamp without time zone,
    is_active boolean DEFAULT true,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verified_by_admin_id uuid,
    account_holder_name character varying(255)
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 19010)
-- Name: cart; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart (
    cart_id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_amount numeric(10,2) DEFAULT 0.00,
    item_count integer DEFAULT 0
);


ALTER TABLE public.cart OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17907)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    cart_item_id uuid NOT NULL,
    cart_id uuid,
    product_id uuid,
    variant_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17928)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    category_id uuid NOT NULL,
    admin_id uuid,
    parent_category_id uuid,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 18228)
-- Name: coupon_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupon_usage (
    usage_id uuid NOT NULL,
    coupon_id uuid,
    customer_id uuid,
    order_id uuid,
    used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.coupon_usage OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17953)
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    coupon_id uuid NOT NULL,
    admin_id uuid,
    code character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    discount_percent numeric(5,2),
    max_discount numeric(10,2),
    min_order_value numeric(10,2),
    used_count integer DEFAULT 0,
    max_usage integer,
    is_active boolean DEFAULT true,
    valid_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 17782)
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    customer_id uuid NOT NULL,
    product_id uuid,
    full_name character varying(255),
    email character varying(255),
    phone character varying(20),
    password_hash text,
    date_of_birth date,
    gender character varying(50),
    profile_picture_url text,
    is_active boolean DEFAULT true,
    is_email_verified boolean DEFAULT false,
    is_phone_verified boolean DEFAULT false,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    block_reason text
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 18618)
-- Name: daily_finances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_finances (
    daily_finance_id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid,
    date date NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0.00,
    platform_commission numeric(12,2) DEFAULT 0.00,
    net_seller_earnings numeric(12,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    monthly_finance_id uuid,
    weekly_finance_id uuid
);


ALTER TABLE public.daily_finances OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 18826)
-- Name: deliveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deliveries (
    delivery_id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    order_item_id uuid,
    seller_id uuid,
    address_id uuid,
    pickup_location_id uuid,
    shipping_address_snapshot jsonb,
    shiprocket_order_id character varying(100),
    shipment_id character varying(100),
    awb_code character varying(100),
    courier_name character varying(255),
    shipping_status character varying(50),
    estimated_delivery_date timestamp without time zone,
    dispatched_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_webhook_id uuid
);


ALTER TABLE public.deliveries OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 18593)
-- Name: finance_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.finance_transactions (
    finance_transactions_id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    payment_id uuid,
    seller_payout_id uuid,
    transaction_type public.transaction_type_enum NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    daily_finance_id uuid
);


ALTER TABLE public.finance_transactions OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 18722)
-- Name: half_yearly_finances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.half_yearly_finances (
    half_yearly_finances_id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid,
    half_number integer NOT NULL,
    year integer NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0.00,
    platform_commission numeric(12,2) DEFAULT 0.00,
    net_seller_earnings numeric(12,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    annual_finance_id uuid
);


ALTER TABLE public.half_yearly_finances OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 18667)
-- Name: month_finances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.month_finances (
    monthly_finance_id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid,
    month_number integer NOT NULL,
    year integer NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0.00,
    platform_commission numeric(12,2) DEFAULT 0.00,
    net_seller_earnings numeric(12,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    quarterly_finance_id uuid
);


ALTER TABLE public.month_finances OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 18029)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    notification_id uuid NOT NULL,
    customer_id uuid,
    seller_id uuid,
    order_id uuid,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    admin_id uuid
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 18056)
-- Name: order_coupon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_coupon (
    order_coupon_id uuid NOT NULL,
    order_id uuid,
    coupon_id uuid,
    discount_amount numeric(12,2) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_coupon OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 18093)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    order_item_id uuid NOT NULL,
    order_id uuid,
    product_id uuid,
    variant_id uuid,
    seller_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    item_status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 18353)
-- Name: order_sellers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_sellers (
    order_seller_id uuid NOT NULL,
    order_id uuid,
    seller_id uuid,
    seller_subtotal numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_sellers OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 18786)
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    status character varying(50) NOT NULL,
    changed_by uuid,
    notes text,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_status_history OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17994)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    order_id uuid NOT NULL,
    customer_id uuid,
    address_id uuid,
    coupon_id uuid,
    subtotal numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0.00,
    tax_amount numeric(12,2) DEFAULT 0.00,
    shipping_charges numeric(12,2) DEFAULT 0.00,
    total_amount numeric(12,2) NOT NULL,
    order_status character varying(50) DEFAULT 'Pending'::character varying,
    payment_status character varying(50) DEFAULT 'Pending'::character varying,
    cancellation_reason text,
    is_deleted boolean DEFAULT false,
    placed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    courier character varying(255),
    tracking_id character varying(255),
    estimated_delivery character varying(255),
    payment_method character varying(50) DEFAULT 'Prepaid'::character varying,
    platform_fee numeric(10,2) DEFAULT 0.00,
    cod_fee numeric(10,2) DEFAULT 0.00
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 18125)
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_verifications (
    otp_id uuid NOT NULL,
    user_type character varying(50),
    user_ref_id uuid,
    contact character varying(255) NOT NULL,
    otp_hash text NOT NULL,
    purpose character varying(50) NOT NULL,
    attempts integer DEFAULT 0,
    is_used boolean DEFAULT false,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.otp_verifications OWNER TO postgres;

--
-- Name: persistent_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.persistent_otps (
    email character varying(255) NOT NULL,
    otp_type character varying(50) NOT NULL,
    otp_code character varying(255) NOT NULL,
    attempts integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email, otp_type)
);


ALTER TABLE public.persistent_otps OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 18140)
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    payment_id uuid NOT NULL,
    customer_id uuid,
    seller_id uuid,
    order_id uuid,
    payment_method character varying(50),
    amount numeric(12,2) NOT NULL,
    transaction_id character varying(255),
    payment_status character varying(50) DEFAULT 'Pending'::character varying,
    paid_at timestamp without time zone,
    gateway_name character varying(100),
    gateway_response_code character varying(100),
    failure_reason_code text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 18311)
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_images (
    image_id uuid NOT NULL,
    product_id uuid,
    image_url text NOT NULL,
    alt_text character varying(255),
    is_primary boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    variant_id uuid
);


ALTER TABLE public.product_images OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 18074)
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    variant_id uuid NOT NULL,
    product_id uuid,
    sku character varying(100),
    variant_name character varying(100) NOT NULL,
    variant_value character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    weight numeric(10,2),
    is_active boolean DEFAULT true,
    name text
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17766)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    product_id uuid NOT NULL,
    category_id uuid,
    seller_id uuid,
    name character varying(255),
    description text,
    sku character varying(100),
    price numeric(10,2),
    mrp numeric(10,2),
    stock_quantity integer,
    weight numeric(10,2),
    length numeric(10,2),
    breadth numeric(10,2),
    height numeric(10,2),
    colors text,
    brand character varying(100),
    is_active boolean DEFAULT true,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    images text[],
    slug character varying(255),
    rating numeric(3,2) DEFAULT 0,
    reviews_count integer DEFAULT 0,
    color character varying(50),
    size character varying(50),
    room character varying(100),
    discount_percent integer DEFAULT 0
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 19198)
-- Name: quarterly_finances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quarterly_finances (
    quarterly_finance_id uuid DEFAULT gen_random_uuid() CONSTRAINT quarterly_finances_quarterly_finance_id_not_null1 NOT NULL,
    monthly_finance_id uuid,
    seller_id uuid,
    quarter_number integer,
    year integer,
    total_revenue numeric(15,2) DEFAULT 0,
    platform_commission numeric(15,2) DEFAULT 0,
    net_seller_earnings numeric(15,2) DEFAULT 0,
    half_yearly_finance_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.quarterly_finances OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 18372)
-- Name: return_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_requests (
    return_request_id uuid NOT NULL,
    order_item_id uuid,
    customer_id uuid,
    order_id uuid,
    resolved_by_admin_id uuid,
    reason text NOT NULL,
    return_type character varying(50) NOT NULL,
    refund_amount numeric(12,2),
    refund_status character varying(50) DEFAULT 'Pending'::character varying,
    resolution_note text,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone
);


ALTER TABLE public.return_requests OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 18862)
-- Name: reverse_shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reverse_shipments (
    reverse_id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_request_id uuid,
    order_item_id uuid,
    seller_id uuid,
    customer_id uuid,
    pickup_address_id uuid,
    dropoff_pickup_location_id uuid,
    shiprocket_reverse_order_id character varying(100),
    reverse_awb_code character varying(100),
    status character varying(50),
    initiated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delivered_at timestamp without time zone
);


ALTER TABLE public.reverse_shipments OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 18202)
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    review_id uuid NOT NULL,
    product_id uuid,
    customer_id uuid,
    order_item_id uuid,
    rating integer NOT NULL,
    title character varying(255),
    body text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    variant_id uuid,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 18404)
-- Name: seller_commissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_commissions (
    commission_id uuid NOT NULL,
    order_item_id uuid,
    seller_id uuid,
    order_id uuid,
    sale_amount numeric(12,2) NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount numeric(12,2) NOT NULL,
    seller_earnings numeric(12,2) NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payout_id uuid
);


ALTER TABLE public.seller_commissions OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 18329)
-- Name: seller_payouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_payouts (
    payout_id uuid NOT NULL,
    seller_id uuid,
    initiated_by_admin_id uuid,
    amount numeric(12,2) NOT NULL,
    payment_method character varying(50),
    transaction_ref character varying(255),
    payout_period_start timestamp without time zone NOT NULL,
    payout_period_end timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone
);


ALTER TABLE public.seller_payouts OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 18287)
-- Name: seller_pickup_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_pickup_location (
    pickup_id uuid NOT NULL,
    seller_id uuid,
    location_name character varying(255) NOT NULL,
    contact_name character varying(255) NOT NULL,
    contact_phone character varying(20) NOT NULL,
    address_line_1 text NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    pincode character varying(20) NOT NULL,
    shipment_location_id character varying(255),
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.seller_pickup_location OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 17748)
-- Name: sellers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sellers (
    seller_id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    password_hash text NOT NULL,
    store_name character varying(25),
    gstin character varying(50),
    store_logo_url text,
    store_description text,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    approved_by_admin_id uuid,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    store_logo text,
    pan character varying(50),
    aadhar character varying(50),
    block_reason text,
    commission_rate numeric(5,2)
);


ALTER TABLE public.sellers OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 18251)
-- Name: shiprocket_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shiprocket_orders (
    sr_order_id uuid NOT NULL,
    order_id uuid,
    payment_id uuid,
    channel_order_id character varying(255),
    awb_code character varying(255),
    shipment_id character varying(255),
    courier_id character varying(100),
    courier_name character varying(255),
    pickup_location character varying(255),
    sr_status character varying(100),
    sr_status_code integer,
    sr_created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shiprocket_orders OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 18802)
-- Name: shiprocket_payload; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shiprocket_payload (
    payload_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sr_order_id uuid,
    product_id uuid,
    order_item_id uuid,
    product_name_snapshot character varying(255),
    sku_snapshot character varying(100),
    quantity integer NOT NULL,
    weight_kg numeric(10,3),
    length_cm numeric(10,2),
    breadth_cm numeric(10,2),
    height_cm numeric(10,2),
    unit_price numeric(12,2),
    total_price numeric(12,2),
    hsn_code character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shiprocket_payload OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 18271)
-- Name: shiprocket_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shiprocket_tracking (
    tracking_id uuid NOT NULL,
    sr_order_id uuid,
    awb_code character varying(255) NOT NULL,
    current_status character varying(100),
    current_location character varying(255),
    estimated_delivery timestamp without time zone,
    activity_log jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shiprocket_tracking OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 18895)
-- Name: shiprocket_webhook_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shiprocket_webhook_log (
    webhook_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sr_order_id uuid,
    event_type character varying(100),
    raw_payload jsonb NOT NULL,
    is_processed boolean DEFAULT false,
    error_message text,
    received_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone
);


ALTER TABLE public.shiprocket_webhook_log OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 18642)
-- Name: weekly_finances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_finances (
    weekly_finance_id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_finance_id uuid,
    seller_id uuid,
    week_number integer NOT NULL,
    year integer NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0.00,
    platform_commission numeric(12,2) DEFAULT 0.00,
    net_seller_earnings numeric(12,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.weekly_finances OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 19041)
-- Name: wishlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wishlist (
    wishlist_id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    item_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wishlist OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 19059)
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wishlist_items (
    wishlist_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    wishlist_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wishlist_items OWNER TO postgres;

--
-- TOC entry 5220 (class 2606 OID 17812)
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (address_id);


--
-- TOC entry 5342 (class 2606 OID 19303)
-- Name: admin_settings admin_settings_admin_id_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_admin_id_key_key UNIQUE (admin_id, key);


--
-- TOC entry 5344 (class 2606 OID 19301)
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (setting_id);


--
-- TOC entry 5222 (class 2606 OID 17835)
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- TOC entry 5224 (class 2606 OID 17833)
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (admin_id);


--
-- TOC entry 5310 (class 2606 OID 18753)
-- Name: annual_finances annual_finances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annual_finances
    ADD CONSTRAINT annual_finances_pkey PRIMARY KEY (annual_finance_id);


--
-- TOC entry 5312 (class 2606 OID 18755)
-- Name: annual_finances annual_finances_seller_id_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annual_finances
    ADD CONSTRAINT annual_finances_seller_id_year_key UNIQUE (seller_id, year);


--
-- TOC entry 5226 (class 2606 OID 17849)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);


--
-- TOC entry 5228 (class 2606 OID 17868)
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 5231 (class 2606 OID 17885)
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (bank_account_id);


--
-- TOC entry 5326 (class 2606 OID 19021)
-- Name: cart cart_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_customer_id_key UNIQUE (customer_id);


--
-- TOC entry 5234 (class 2606 OID 17917)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (cart_item_id);


--
-- TOC entry 5328 (class 2606 OID 19019)
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (cart_id);


--
-- TOC entry 5236 (class 2606 OID 17940)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- TOC entry 5238 (class 2606 OID 17942)
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- TOC entry 5268 (class 2606 OID 18234)
-- Name: coupon_usage coupon_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_pkey PRIMARY KEY (usage_id);


--
-- TOC entry 5240 (class 2606 OID 17965)
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- TOC entry 5242 (class 2606 OID 17963)
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (coupon_id);


--
-- TOC entry 5216 (class 2606 OID 17796)
-- Name: customers customers_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_email_key UNIQUE (email);


--
-- TOC entry 5218 (class 2606 OID 17794)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- TOC entry 5294 (class 2606 OID 18629)
-- Name: daily_finances daily_finances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_finances
    ADD CONSTRAINT daily_finances_pkey PRIMARY KEY (daily_finance_id);


--
-- TOC entry 5296 (class 2606 OID 18631)
-- Name: daily_finances daily_finances_seller_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_finances
    ADD CONSTRAINT daily_finances_seller_id_date_key UNIQUE (seller_id, date);


--
-- TOC entry 5318 (class 2606 OID 18836)
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (delivery_id);


--
-- TOC entry 5292 (class 2606 OID 18602)
-- Name: finance_transactions finance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_pkey PRIMARY KEY (finance_transactions_id);


--
-- TOC entry 5306 (class 2606 OID 18734)
-- Name: half_yearly_finances half_yearly_finances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_yearly_finances
    ADD CONSTRAINT half_yearly_finances_pkey PRIMARY KEY (half_yearly_finances_id);


--
-- TOC entry 5308 (class 2606 OID 18736)
-- Name: half_yearly_finances half_yearly_finances_seller_id_half_number_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_yearly_finances
    ADD CONSTRAINT half_yearly_finances_seller_id_half_number_year_key UNIQUE (seller_id, half_number, year);


--
-- TOC entry 5302 (class 2606 OID 18679)
-- Name: month_finances month_finances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.month_finances
    ADD CONSTRAINT month_finances_pkey PRIMARY KEY (monthly_finance_id);


--
-- TOC entry 5304 (class 2606 OID 18681)
-- Name: month_finances month_finances_seller_id_month_number_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.month_finances
    ADD CONSTRAINT month_finances_seller_id_month_number_year_key UNIQUE (seller_id, month_number, year);


--
-- TOC entry 5248 (class 2606 OID 18040)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- TOC entry 5250 (class 2606 OID 18063)
-- Name: order_coupon order_coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_coupon
    ADD CONSTRAINT order_coupon_pkey PRIMARY KEY (order_coupon_id);


--
-- TOC entry 5256 (class 2606 OID 18104)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id);


--
-- TOC entry 5286 (class 2606 OID 18360)
-- Name: order_sellers order_sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_sellers
    ADD CONSTRAINT order_sellers_pkey PRIMARY KEY (order_seller_id);


--
-- TOC entry 5314 (class 2606 OID 18796)
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 5246 (class 2606 OID 18011)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- TOC entry 5258 (class 2606 OID 18139)
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (otp_id);


--
-- TOC entry 5262 (class 2606 OID 18151)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 5264 (class 2606 OID 18153)
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- TOC entry 5281 (class 2606 OID 18322)
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (image_id);


--
-- TOC entry 5252 (class 2606 OID 18085)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (variant_id);


--
-- TOC entry 5254 (class 2606 OID 18087)
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- TOC entry 5212 (class 2606 OID 17776)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- TOC entry 5214 (class 2606 OID 18919)
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- TOC entry 5338 (class 2606 OID 19208)
-- Name: quarterly_finances quarterly_finances_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quarterly_finances
    ADD CONSTRAINT quarterly_finances_pkey1 PRIMARY KEY (quarterly_finance_id);


--
-- TOC entry 5340 (class 2606 OID 19210)
-- Name: quarterly_finances quarterly_finances_seller_id_quarter_number_year_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quarterly_finances
    ADD CONSTRAINT quarterly_finances_seller_id_quarter_number_year_key1 UNIQUE (seller_id, quarter_number, year);


--
-- TOC entry 5288 (class 2606 OID 18383)
-- Name: return_requests return_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_pkey PRIMARY KEY (return_request_id);


--
-- TOC entry 5322 (class 2606 OID 18869)
-- Name: reverse_shipments reverse_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_shipments
    ADD CONSTRAINT reverse_shipments_pkey PRIMARY KEY (reverse_id);


--
-- TOC entry 5266 (class 2606 OID 18212)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (review_id);


--
-- TOC entry 5290 (class 2606 OID 18415)
-- Name: seller_commissions seller_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_commissions
    ADD CONSTRAINT seller_commissions_pkey PRIMARY KEY (commission_id);


--
-- TOC entry 5283 (class 2606 OID 18341)
-- Name: seller_payouts seller_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_payouts
    ADD CONSTRAINT seller_payouts_pkey PRIMARY KEY (payout_id);


--
-- TOC entry 5278 (class 2606 OID 18304)
-- Name: seller_pickup_location seller_pickup_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_pickup_location
    ADD CONSTRAINT seller_pickup_location_pkey PRIMARY KEY (pickup_id);


--
-- TOC entry 5208 (class 2606 OID 17765)
-- Name: sellers sellers_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_email_key UNIQUE (email);


--
-- TOC entry 5210 (class 2606 OID 17763)
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (seller_id);


--
-- TOC entry 5272 (class 2606 OID 18259)
-- Name: shiprocket_orders shiprocket_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_orders
    ADD CONSTRAINT shiprocket_orders_pkey PRIMARY KEY (sr_order_id);


--
-- TOC entry 5316 (class 2606 OID 18810)
-- Name: shiprocket_payload shiprocket_payload_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_payload
    ADD CONSTRAINT shiprocket_payload_pkey PRIMARY KEY (payload_id);


--
-- TOC entry 5275 (class 2606 OID 18280)
-- Name: shiprocket_tracking shiprocket_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_tracking
    ADD CONSTRAINT shiprocket_tracking_pkey PRIMARY KEY (tracking_id);


--
-- TOC entry 5324 (class 2606 OID 18906)
-- Name: shiprocket_webhook_log shiprocket_webhook_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_webhook_log
    ADD CONSTRAINT shiprocket_webhook_log_pkey PRIMARY KEY (webhook_id);


--
-- TOC entry 5260 (class 2606 OID 19147)
-- Name: otp_verifications unique_contact; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT unique_contact UNIQUE (contact);


--
-- TOC entry 5320 (class 2606 OID 19317)
-- Name: deliveries unique_order_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT unique_order_id UNIQUE (order_id);


--
-- TOC entry 5298 (class 2606 OID 18654)
-- Name: weekly_finances weekly_finances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_finances
    ADD CONSTRAINT weekly_finances_pkey PRIMARY KEY (weekly_finance_id);


--
-- TOC entry 5300 (class 2606 OID 18656)
-- Name: weekly_finances weekly_finances_seller_id_week_number_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_finances
    ADD CONSTRAINT weekly_finances_seller_id_week_number_year_key UNIQUE (seller_id, week_number, year);


--
-- TOC entry 5330 (class 2606 OID 19053)
-- Name: wishlist wishlist_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_customer_id_key UNIQUE (customer_id);


--
-- TOC entry 5334 (class 2606 OID 19068)
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (wishlist_item_id);


--
-- TOC entry 5336 (class 2606 OID 19070)
-- Name: wishlist_items wishlist_items_wishlist_id_product_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_wishlist_id_product_id_variant_id_key UNIQUE (wishlist_id, product_id, variant_id);


--
-- TOC entry 5332 (class 2606 OID 19051)
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (wishlist_id);


--
-- TOC entry 5229 (class 1259 OID 17869)
-- Name: idx_auth_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_sessions_token ON public.auth_sessions USING btree (token_hash);


--
-- TOC entry 5232 (class 1259 OID 17891)
-- Name: idx_bank_accounts_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_owner ON public.bank_accounts USING btree (owner_type, owner_id);


--
-- TOC entry 5243 (class 1259 OID 18027)
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);


--
-- TOC entry 5244 (class 1259 OID 18028)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (order_status);


--
-- TOC entry 5279 (class 1259 OID 18328)
-- Name: idx_product_primary_image; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_primary_image ON public.product_images USING btree (product_id, is_primary);


--
-- TOC entry 5276 (class 1259 OID 18310)
-- Name: idx_seller_pickup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seller_pickup ON public.seller_pickup_location USING btree (seller_id);


--
-- TOC entry 5270 (class 1259 OID 18270)
-- Name: idx_shiprocket_awb; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shiprocket_awb ON public.shiprocket_orders USING btree (awb_code);


--
-- TOC entry 5273 (class 1259 OID 18286)
-- Name: idx_tracking_awb; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tracking_awb ON public.shiprocket_tracking USING btree (awb_code);


--
-- TOC entry 5269 (class 1259 OID 18250)
-- Name: idx_unique_coupon_per_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_coupon_per_customer ON public.coupon_usage USING btree (coupon_id, customer_id);


--
-- TOC entry 5284 (class 1259 OID 18371)
-- Name: idx_unique_seller_per_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_seller_per_order ON public.order_sellers USING btree (order_id, seller_id);


--
-- TOC entry 5347 (class 2606 OID 19148)
-- Name: addresses addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5348 (class 2606 OID 17818)
-- Name: addresses addresses_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5435 (class 2606 OID 19304)
-- Name: admin_settings admin_settings_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5349 (class 2606 OID 17836)
-- Name: admins admins_created_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_created_by_admin_fkey FOREIGN KEY (created_by_admin) REFERENCES public.admins(admin_id);


--
-- TOC entry 5412 (class 2606 OID 18756)
-- Name: annual_finances annual_finances_half_yearly_finance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annual_finances
    ADD CONSTRAINT annual_finances_half_yearly_finance_id_fkey FOREIGN KEY (half_yearly_finance_id) REFERENCES public.half_yearly_finances(half_yearly_finances_id);


--
-- TOC entry 5413 (class 2606 OID 18761)
-- Name: annual_finances annual_finances_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annual_finances
    ADD CONSTRAINT annual_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5350 (class 2606 OID 17850)
-- Name: audit_logs audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5351 (class 2606 OID 17886)
-- Name: bank_accounts bank_accounts_verified_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_verified_by_admin_id_fkey FOREIGN KEY (verified_by_admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5430 (class 2606 OID 19193)
-- Name: cart cart_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5352 (class 2606 OID 19027)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.cart(cart_id) ON DELETE CASCADE;


--
-- TOC entry 5353 (class 2606 OID 17923)
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- TOC entry 5354 (class 2606 OID 17943)
-- Name: categories categories_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5355 (class 2606 OID 17948)
-- Name: categories categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(category_id);


--
-- TOC entry 5378 (class 2606 OID 18235)
-- Name: coupon_usage coupon_usage_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(coupon_id) ON DELETE CASCADE;


--
-- TOC entry 5379 (class 2606 OID 19173)
-- Name: coupon_usage coupon_usage_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5380 (class 2606 OID 19106)
-- Name: coupon_usage coupon_usage_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5356 (class 2606 OID 17966)
-- Name: coupons coupons_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5346 (class 2606 OID 17797)
-- Name: customers customers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- TOC entry 5403 (class 2606 OID 18687)
-- Name: daily_finances daily_finances_monthly_finance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_finances
    ADD CONSTRAINT daily_finances_monthly_finance_id_fkey FOREIGN KEY (monthly_finance_id) REFERENCES public.month_finances(monthly_finance_id);


--
-- TOC entry 5404 (class 2606 OID 18632)
-- Name: daily_finances daily_finances_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_finances
    ADD CONSTRAINT daily_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5405 (class 2606 OID 18692)
-- Name: daily_finances daily_finances_weekly_finance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_finances
    ADD CONSTRAINT daily_finances_weekly_finance_id_fkey FOREIGN KEY (weekly_finance_id) REFERENCES public.weekly_finances(weekly_finance_id);


--
-- TOC entry 5418 (class 2606 OID 18852)
-- Name: deliveries deliveries_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(address_id);


--
-- TOC entry 5419 (class 2606 OID 19141)
-- Name: deliveries deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5420 (class 2606 OID 18842)
-- Name: deliveries deliveries_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id);


--
-- TOC entry 5421 (class 2606 OID 18857)
-- Name: deliveries deliveries_pickup_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pickup_location_id_fkey FOREIGN KEY (pickup_location_id) REFERENCES public.seller_pickup_location(pickup_id);


--
-- TOC entry 5422 (class 2606 OID 18913)
-- Name: deliveries deliveries_processed_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_processed_webhook_id_fkey FOREIGN KEY (processed_webhook_id) REFERENCES public.shiprocket_webhook_log(webhook_id);


--
-- TOC entry 5423 (class 2606 OID 18847)
-- Name: deliveries deliveries_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5399 (class 2606 OID 18637)
-- Name: finance_transactions finance_transactions_daily_finance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_daily_finance_id_fkey FOREIGN KEY (daily_finance_id) REFERENCES public.daily_finances(daily_finance_id);


--
-- TOC entry 5400 (class 2606 OID 19131)
-- Name: finance_transactions finance_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5401 (class 2606 OID 18608)
-- Name: finance_transactions finance_transactions_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(payment_id);


--
-- TOC entry 5402 (class 2606 OID 18613)
-- Name: finance_transactions finance_transactions_seller_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_seller_payout_id_fkey FOREIGN KEY (seller_payout_id) REFERENCES public.seller_payouts(payout_id);


--
-- TOC entry 5410 (class 2606 OID 18781)
-- Name: half_yearly_finances half_yearly_finances_annual_finance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_yearly_finances
    ADD CONSTRAINT half_yearly_finances_annual_finance_id_fkey FOREIGN KEY (annual_finance_id) REFERENCES public.annual_finances(annual_finance_id);


--
-- TOC entry 5411 (class 2606 OID 18737)
-- Name: half_yearly_finances half_yearly_finances_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.half_yearly_finances
    ADD CONSTRAINT half_yearly_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5408 (class 2606 OID 19211)
-- Name: month_finances month_finances_quarterly_finance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.month_finances
    ADD CONSTRAINT month_finances_quarterly_finance_id_fkey FOREIGN KEY (quarterly_finance_id) REFERENCES public.quarterly_finances(quarterly_finance_id);


--
-- TOC entry 5409 (class 2606 OID 18682)
-- Name: month_finances month_finances_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.month_finances
    ADD CONSTRAINT month_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5360 (class 2606 OID 19285)
-- Name: notifications notifications_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5361 (class 2606 OID 19158)
-- Name: notifications notifications_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5362 (class 2606 OID 19086)
-- Name: notifications notifications_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5363 (class 2606 OID 18046)
-- Name: notifications notifications_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5364 (class 2606 OID 18069)
-- Name: order_coupon order_coupon_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_coupon
    ADD CONSTRAINT order_coupon_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(coupon_id);


--
-- TOC entry 5365 (class 2606 OID 19091)
-- Name: order_coupon order_coupon_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_coupon
    ADD CONSTRAINT order_coupon_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5367 (class 2606 OID 19096)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5368 (class 2606 OID 18110)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- TOC entry 5369 (class 2606 OID 18120)
-- Name: order_items order_items_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5370 (class 2606 OID 18115)
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(variant_id);


--
-- TOC entry 5389 (class 2606 OID 19116)
-- Name: order_sellers order_sellers_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_sellers
    ADD CONSTRAINT order_sellers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5390 (class 2606 OID 18366)
-- Name: order_sellers order_sellers_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_sellers
    ADD CONSTRAINT order_sellers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5414 (class 2606 OID 19136)
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5357 (class 2606 OID 18017)
-- Name: orders orders_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(address_id);


--
-- TOC entry 5358 (class 2606 OID 18022)
-- Name: orders orders_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(coupon_id);


--
-- TOC entry 5359 (class 2606 OID 19153)
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5371 (class 2606 OID 19163)
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5372 (class 2606 OID 19101)
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5373 (class 2606 OID 18159)
-- Name: payments payments_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5385 (class 2606 OID 18323)
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- TOC entry 5386 (class 2606 OID 18929)
-- Name: product_images product_images_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(variant_id) ON DELETE CASCADE;


--
-- TOC entry 5366 (class 2606 OID 18088)
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- TOC entry 5345 (class 2606 OID 17777)
-- Name: products products_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5391 (class 2606 OID 19178)
-- Name: return_requests return_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5392 (class 2606 OID 19121)
-- Name: return_requests return_requests_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5393 (class 2606 OID 18384)
-- Name: return_requests return_requests_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id);


--
-- TOC entry 5394 (class 2606 OID 18399)
-- Name: return_requests return_requests_resolved_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_resolved_by_admin_id_fkey FOREIGN KEY (resolved_by_admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5424 (class 2606 OID 19183)
-- Name: reverse_shipments reverse_shipments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_shipments
    ADD CONSTRAINT reverse_shipments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5425 (class 2606 OID 18875)
-- Name: reverse_shipments reverse_shipments_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_shipments
    ADD CONSTRAINT reverse_shipments_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id);


--
-- TOC entry 5426 (class 2606 OID 18890)
-- Name: reverse_shipments reverse_shipments_pickup_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_shipments
    ADD CONSTRAINT reverse_shipments_pickup_address_id_fkey FOREIGN KEY (pickup_address_id) REFERENCES public.addresses(address_id);


--
-- TOC entry 5427 (class 2606 OID 18870)
-- Name: reverse_shipments reverse_shipments_return_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_shipments
    ADD CONSTRAINT reverse_shipments_return_request_id_fkey FOREIGN KEY (return_request_id) REFERENCES public.return_requests(return_request_id);


--
-- TOC entry 5428 (class 2606 OID 18880)
-- Name: reverse_shipments reverse_shipments_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reverse_shipments
    ADD CONSTRAINT reverse_shipments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5374 (class 2606 OID 19168)
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5375 (class 2606 OID 18223)
-- Name: reviews reviews_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id);


--
-- TOC entry 5376 (class 2606 OID 18213)
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- TOC entry 5377 (class 2606 OID 19309)
-- Name: reviews reviews_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(variant_id);


--
-- TOC entry 5395 (class 2606 OID 19126)
-- Name: seller_commissions seller_commissions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_commissions
    ADD CONSTRAINT seller_commissions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5396 (class 2606 OID 18416)
-- Name: seller_commissions seller_commissions_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_commissions
    ADD CONSTRAINT seller_commissions_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id) ON DELETE CASCADE;


--
-- TOC entry 5397 (class 2606 OID 19319)
-- Name: seller_commissions seller_commissions_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_commissions
    ADD CONSTRAINT seller_commissions_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.seller_payouts(payout_id);


--
-- TOC entry 5398 (class 2606 OID 18421)
-- Name: seller_commissions seller_commissions_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_commissions
    ADD CONSTRAINT seller_commissions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5387 (class 2606 OID 18347)
-- Name: seller_payouts seller_payouts_initiated_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_payouts
    ADD CONSTRAINT seller_payouts_initiated_by_admin_id_fkey FOREIGN KEY (initiated_by_admin_id) REFERENCES public.admins(admin_id);


--
-- TOC entry 5388 (class 2606 OID 18342)
-- Name: seller_payouts seller_payouts_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_payouts
    ADD CONSTRAINT seller_payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5384 (class 2606 OID 18305)
-- Name: seller_pickup_location seller_pickup_location_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_pickup_location
    ADD CONSTRAINT seller_pickup_location_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id) ON DELETE CASCADE;


--
-- TOC entry 5381 (class 2606 OID 19111)
-- Name: shiprocket_orders shiprocket_orders_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_orders
    ADD CONSTRAINT shiprocket_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- TOC entry 5382 (class 2606 OID 18265)
-- Name: shiprocket_orders shiprocket_orders_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_orders
    ADD CONSTRAINT shiprocket_orders_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(payment_id);


--
-- TOC entry 5415 (class 2606 OID 18821)
-- Name: shiprocket_payload shiprocket_payload_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_payload
    ADD CONSTRAINT shiprocket_payload_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id);


--
-- TOC entry 5416 (class 2606 OID 18816)
-- Name: shiprocket_payload shiprocket_payload_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_payload
    ADD CONSTRAINT shiprocket_payload_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- TOC entry 5417 (class 2606 OID 18811)
-- Name: shiprocket_payload shiprocket_payload_sr_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_payload
    ADD CONSTRAINT shiprocket_payload_sr_order_id_fkey FOREIGN KEY (sr_order_id) REFERENCES public.shiprocket_orders(sr_order_id);


--
-- TOC entry 5383 (class 2606 OID 18281)
-- Name: shiprocket_tracking shiprocket_tracking_sr_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_tracking
    ADD CONSTRAINT shiprocket_tracking_sr_order_id_fkey FOREIGN KEY (sr_order_id) REFERENCES public.shiprocket_orders(sr_order_id) ON DELETE CASCADE;


--
-- TOC entry 5429 (class 2606 OID 18907)
-- Name: shiprocket_webhook_log shiprocket_webhook_log_sr_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shiprocket_webhook_log
    ADD CONSTRAINT shiprocket_webhook_log_sr_order_id_fkey FOREIGN KEY (sr_order_id) REFERENCES public.shiprocket_orders(sr_order_id);


--
-- TOC entry 5406 (class 2606 OID 18657)
-- Name: weekly_finances weekly_finances_daily_finance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_finances
    ADD CONSTRAINT weekly_finances_daily_finance_id_fkey FOREIGN KEY (daily_finance_id) REFERENCES public.daily_finances(daily_finance_id);


--
-- TOC entry 5407 (class 2606 OID 18662)
-- Name: weekly_finances weekly_finances_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_finances
    ADD CONSTRAINT weekly_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(seller_id);


--
-- TOC entry 5431 (class 2606 OID 19188)
-- Name: wishlist wishlist_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5432 (class 2606 OID 19076)
-- Name: wishlist_items wishlist_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- TOC entry 5433 (class 2606 OID 19081)
-- Name: wishlist_items wishlist_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(variant_id) ON DELETE SET NULL;


--
-- TOC entry 5434 (class 2606 OID 19071)
-- Name: wishlist_items wishlist_items_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES public.wishlist(wishlist_id) ON DELETE CASCADE;


-- Completed on 2026-04-26 17:01:27

--
-- PostgreSQL database dump complete
--

\unrestrict mLBET2iASb32TZRBpDPQLBDsjTA261MR36dLr7xiZeInr9Ff4hA70h1hCfWgKx7

