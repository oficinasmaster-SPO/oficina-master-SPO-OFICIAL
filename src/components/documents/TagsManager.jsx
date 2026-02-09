import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag } from "lucide-react";
import { toast } from "sonner";

/**
 * Gerenciador de tags customizadas
 */
export default function TagsManager({ document, onUpdate }) {
  const [tags, setTags] = useState(document?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    
    if (tags.includes(tag)) {
      toast.error("Tag já existe");
      return;
    }

    const updatedTags = [...tags, tag];
    setTags(updatedTags);
    setNewTag("");
    onUpdate?.(updatedTags);
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    onUpdate?.(updatedTags);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              <Tag className="w-3 h-3" />
              {tag}
              {isEditing && (
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-gray-300 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-gray-400">Sem tags</span>
        )}
        
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            Editar
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="flex gap-2">
          <Input
            placeholder="Nova tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            className="h-8"
          />
          <Button size="sm" onClick={addTag} className="h-8">
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="h-8"
          >
            OK
          </Button>
        </div>
      )}
    </div>
  );
}