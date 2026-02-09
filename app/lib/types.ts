
import { User } from "@supabase/supabase-js";

// Base interface for items with a name, useful for packages or other entities
export interface NamedItem {
  name: string;
}

// Represents the structure of a pricing package
export interface PricingPackage extends NamedItem { }

// Represents a Lead, typically from a potential customer
export interface Lead {
  id: string;
  school_name: string | null;
  created_at: string;
  created_by: string | null;
  pricing_package_id: string | null;
  pricing_packages: PricingPackage | null;
}

// Represents an Album, which can be a yearbook or a public album
export interface Album {
  id: string;
  name: string;
  type: 'yearbook' | 'public';
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  lead_id: string | null;
  user_id: string;
  pricing_package_id: string | null;
  pricing_packages: PricingPackage | null;
  users: User | null;
}

// A combined type for data that can be either an Album or a Lead
export type AlbumOrLead = (Album & { is_lead: false }) | (Lead & { is_lead: true });
