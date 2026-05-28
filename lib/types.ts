export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  published_year: number | null;
  rating: number | null;
  status: "owned" | "lent";
  lent_to: string | null;
  lent_date: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  published_year: number | null;
  created_at: string;
}

export interface BookInfo {
  isbn: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  published_year: number | null;
}
