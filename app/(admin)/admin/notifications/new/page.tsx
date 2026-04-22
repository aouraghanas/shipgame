import { NotificationForm } from "@/components/admin/NotificationForm";

export default function NewNotificationPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">New Notification</h1>
        <p className="text-zinc-400 mt-1">Create an announcement bar for users</p>
      </div>
      <NotificationForm mode="create" />
    </div>
  );
}
