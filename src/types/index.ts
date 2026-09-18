export type UserRole = "SUPER_ADMIN" | "FAMILY_ADMIN" | "FAMILY_MEMBER" | "VIEWER";

export interface User {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  family_member_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Gender = "male" | "female";

export interface FamilyMember {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  nickname: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  is_deceased: number; // 0 or 1
  profile_photo: string | null;
  photo_url?: string | null;
  bio: string | null;
  family_role: string | null;
  is_family_lead: number; // 0 or 1
  generation: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type RelationshipType = "parent" | "child" | "spouse" | "sibling";

export interface Relationship {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: RelationshipType;
  created_at: string;
}

export interface Marriage {
  id: string;
  person1_id: string;
  person2_id: string;
  marriage_date: string | null;
  status: "active" | "widowed" | "separated";
  notes: string | null;
  created_at: string;
}

export type DocumentCategory =
  | "Identity"
  | "Financial"
  | "Property"
  | "Education"
  | "Marriage & Family"
  | "Medical"
  | "Insurance"
  | "Legal"
  | "Vehicle"
  | "Other";

export type DocumentVisibility = "FAMILY_ONLY" | "PRIVATE" | "SPECIFIC_USERS";

export interface FamilyDocument {
  id: string;
  person_id: string;
  name: string;
  category: DocumentCategory;
  description: string | null;
  file_path: string;
  file_type: string;
  file_size: number;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  visibility: DocumentVisibility;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
}

export interface PhotoAlbum {
  id: string;
  name: string;
  description: string | null;
  cover_photo: string | null;
  created_by: string;
  created_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  file_path: string;
  caption: string | null;
  date_taken: string | null;
  uploaded_by: string;
  tagged_members?: { id: string; first_name: string; last_name: string | null }[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  target_type: string;
  target_id: string;
  target_name: string;
  details: string | null;
  ip_address: string | null;
  timestamp: string;
}

export interface FamilySettings {
  family_name: string;
  family_description: string;
  family_lead_id: string;
  default_document_visibility: DocumentVisibility;
  allowed_file_types: string;
  max_file_size_mb: number;
}
