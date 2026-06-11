// Hand-written database types, shaped like `supabase gen types typescript`
// output so a generated file can drop in later with a one-line import change.

export type TaskStatus = "inprogress" | "done";
export type TeamItemType = "todo" | "tbd";
export type ManualStatus = "off" | null;
export type DerivedStatus = "off" | "inprogress" | "chill";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          manual_status: ManualStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          manual_status?: ManualStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          manual_status?: ManualStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          link: string | null;
          status: TaskStatus;
          assignee_id: string;
          created_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          link?: string | null;
          status?: TaskStatus;
          assignee_id: string;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          link?: string | null;
          status?: TaskStatus;
          assignee_id?: string;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_items: {
        Row: {
          id: string;
          type: TeamItemType;
          content: string;
          link: string | null;
          done: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: TeamItemType;
          content: string;
          link?: string | null;
          done?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: TeamItemType;
          content?: string;
          link?: string | null;
          done?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      jira_connections: {
        Row: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          cloud_id: string;
          site_url: string;
          jira_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          cloud_id: string;
          site_url: string;
          jira_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          cloud_id?: string;
          site_url?: string;
          jira_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          actor_id: string | null;
          type: string;
          target_user_id: string | null;
          entity_id: string | null;
          detail: string | null;
          meta: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          type: string;
          target_user_id?: string | null;
          entity_id?: string | null;
          detail?: string | null;
          meta?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          type?: string;
          target_user_id?: string | null;
          entity_id?: string | null;
          detail?: string | null;
          meta?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TeamItem = Database["public"]["Tables"]["team_items"]["Row"];
