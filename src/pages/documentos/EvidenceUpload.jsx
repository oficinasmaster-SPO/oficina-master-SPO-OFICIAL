import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from '@/api/base44Client';
import {  Card, CardContent, CardHeader, CardTitle, CardDescription  } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, CheckCircle2, Camera } from "lucide-react";
import { toast } from "sonner";

export default function EvidenceUpload() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  
  const [ritual, setRitual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadRitual();
  }, [token]);

  const loadRitual = async () => {
    try {
      // In a real scenario, we would search by token. 
      // For now, assuming we filter by evidence_token.
      const rituals = await base44.entities.ScheduledRitual.filter({ evidence_token: token });
      if (rituals && rituals.length > 0) {
        setRitual(rituals[0]);
        if (rituals[0].evidence_url) {
            // Already uploaded? Maybe allow another.
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Update ritual with evidence
      if (ritual) {
        await base44.entities.ScheduledRitual.update(ritual.id, {
            evidence_url: file_url,
            status: 'realizado' // or 'evidenciado'
        });
        setCompleted(true);
        toast.success("EvidÃªncia enviada com sucesso!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  if (!ritual) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-gray-500">Ritual nÃ£o encontrado ou link invÃ¡lido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-green-50">
        <Card className="w-full max-w-md text-center border-green-200 shadow-lg">
          <CardContent className="pt-10 pb-10">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Sucesso!</h2>
            <p className="text-green-700">Sua evidÃªncia foi registrada com sucesso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center border-b bg-purple-50 rounded-t-xl">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Camera className="w-6 h-6 text-purple-600" />
          </div>
          <CardTitle className="text-xl text-purple-900">{ritual.ritual_name}</CardTitle>
          <CardDescription>
            Data: {new Date(ritual.scheduled_date).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            <p className="text-gray-600">
              Por favor, envie uma foto ou documento que comprove a realizaÃ§Ã£o deste ritual.
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <Input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="evidence-upload"
                disabled={uploading}
              />
              <Label 
                htmlFor="evidence-upload" 
                className="cursor-pointer w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <Upload className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mb-2" />
                <span className="text-sm text-gray-500 group-hover:text-purple-700">
                  Clique para selecionar arquivo
                </span>
              </Label>
              
              {uploading && (
                <div className="flex items-center gap-2 text-purple-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



