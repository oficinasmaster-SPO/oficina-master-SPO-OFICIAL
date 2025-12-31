import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MAPComments({ mapId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (mapId) {
      loadComments();
    }
  }, [mapId]);

  const loadComments = async () => {
    try {
      // Usar entity ProcessAssessment para comentários
      const commentsData = await base44.entities.ProcessAssessment.filter({
        process_document_id: mapId
      });
      setComments(commentsData.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ));
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      toast.error("Digite um comentário");
      return;
    }

    setPosting(true);
    try {
      await base44.entities.ProcessAssessment.create({
        process_document_id: mapId,
        assessed_by: user.id,
        assessor_name: user.full_name,
        assessment_type: "comment",
        comments: newComment,
        assessment_date: new Date().toISOString()
      });

      toast.success("Comentário adicionado!");
      setNewComment("");
      loadComments();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar comentário");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;

    try {
      await base44.entities.ProcessAssessment.delete(commentId);
      toast.success("Comentário excluído");
      loadComments();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir comentário");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Carregando comentários...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Novo comentário */}
        <div className="space-y-2">
          <Textarea
            placeholder="Adicione um comentário ou feedback..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handlePostComment} 
            disabled={posting}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {posting ? "Enviando..." : "Comentar"}
          </Button>
        </div>

        {/* Lista de comentários */}
        {comments.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{comment.assessor_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(comment.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comments}</p>
                  </div>
                  {user.id === comment.assessed_by && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        )}
      </CardContent>
    </Card>
  );
}