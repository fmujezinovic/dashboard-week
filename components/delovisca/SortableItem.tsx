"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

export default function SortableItem({
  id,
  content,
}: {
  id: string
  content: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-3 p-2 hover:bg-muted rounded transition">
        <span {...listeners} className="text-gray-400">
          <GripVertical className="w-5 h-5" />
        </span>
        {content}
      </div>
    </li>
  )
}
