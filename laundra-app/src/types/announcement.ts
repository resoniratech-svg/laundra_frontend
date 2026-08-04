export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  pinned?: boolean;
  priority?: 'High' | 'Medium' | 'Low';
  read?: boolean;
}

export interface NotificationItem {
  id: string | number;
  text: string;
  time: string;
  unread: boolean;
}
