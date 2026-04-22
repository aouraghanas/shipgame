"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NotificationForm } from "@/components/admin/NotificationForm";

export default function EditNotificationPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notifications/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-zinc-400 text-center py-20">Notification not found.</p>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Edit Notification</h1>
        <p className="text-zinc-400 mt-1">{data.title as string}</p>
      </div>
      <NotificationForm mode="edit" notificationId={id} initialData={data} />
    </div>
  );
}
