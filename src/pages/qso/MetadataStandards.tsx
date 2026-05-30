import React, { useState } from 'react';
import { 
  FileCode, 
  Plus, 
  Trash2, 
  Check, 
  HelpCircle, 
  Settings, 
  Eye, 
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SchemaField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  category: 'Core' | 'Qualification' | 'Verification' | 'Custom';
  description: string;
}

export default function MetadataStandards() {
  const [fields, setFields] = useState<SchemaField[]>([
    { key: 'learnerName', label: 'Learner Full Name', type: 'string', required: true, category: 'Core', description: 'Full name of the badge recipient registered in TESDA records.' },
    { key: 'learnerEmail', label: 'Learner Email Address', type: 'string', required: true, category: 'Core', description: 'Email address of the learner for badge delivery and wallet association.' },
    { key: 'qualificationCode', label: 'Qualification Code', type: 'string', required: true, category: 'Qualification', description: 'Unified TESDA code representing the qualification (e.g. CSS-NCII-2026).' },
    { key: 'qualificationLevel', label: 'Credential Level', type: 'string', required: true, category: 'Qualification', description: 'Eog. National Certificate II, Certificate of Training, or Micro-credential.' },
    { key: 'issuingOffice', label: 'Issuing Authority / Center', type: 'string', required: true, category: 'Verification', description: 'The verified training center, assessment school, or regional director.' },
    { key: 'issueDate', label: 'Date of Issue', type: 'date', required: true, category: 'Core', description: 'Timestamp when the badge was sealed and written to the registry.' },
    { key: 'validityMonths', label: 'Validity Period (Months)', type: 'number', required: false, category: 'Core', description: 'Expiration calculation in months from the date of issue.' },
    { key: 'signatureBlock', label: 'Digital Cryptographic Seal', type: 'string', required: true, category: 'Verification', description: 'Electronic signature certificate verifying the original issuing authority.' },
  ]);

  const [newField, setNewField] = useState<Partial<SchemaField>>({
    key: '',
    label: '',
    type: 'string',
    required: false,
    category: 'Custom',
    description: ''
  });

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copied, setCopied] = useState(false);

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.key || !newField.label) return;

    // Sanitize Key to camelCase
    const sanitizedKey = newField.key
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[A-Z]/, (c) => c.toLowerCase());

    const fieldToAdd: SchemaField = {
      key: sanitizedKey,
      label: newField.label,
      type: newField.type || 'string',
      required: !!newField.required,
      category: newField.category || 'Custom',
      description: newField.description || 'Custom metadata descriptor.'
    };

    setFields([...fields, fieldToAdd]);
    setNewField({
      key: '',
      label: '',
      type: 'string',
      required: false,
      category: 'Custom',
      description: ''
    });
  };

  const handleDeleteField = (key: string) => {
    setFields(fields.filter(f => f.key !== key));
  };

  const getFilteredFields = () => {
    if (activeCategory === 'All') return fields;
    return fields.filter(f => f.category === activeCategory);
  };

  const generateSchemaJson = () => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    fields.forEach(f => {
      properties[f.key] = {
        type: f.type,
        title: f.label,
        description: f.description
      };
      if (f.required) {
        required.push(f.key);
      }
    });

    return JSON.stringify({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "TESDA-DigitalBadgeMetadata",
      "type": "object",
      "properties": properties,
      "required": required
    }, null, 2);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateSchemaJson());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <FileCode className="h-8 w-8 text-blue-600" />
          Metadata Standards
        </h1>
        <p className="text-slate-500 mt-1">Define mandatory, structured properties and schemas for all active digital badges.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Core Field Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Schema Fields Protocol</CardTitle>
                <CardDescription>Configure validation fields across categories.</CardDescription>
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {['All', 'Core', 'Qualification', 'Verification', 'Custom'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all ${
                      activeCategory === cat 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getFilteredFields().map((field) => (
                  <div 
                    key={field.key} 
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all gap-4"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{field.label}</span>
                        <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {field.key}
                        </code>
                        {field.required && (
                          <Badge variant="destructive" className="bg-rose-50 text-[9px] hover:bg-rose-50 text-rose-500 border border-rose-200 font-extrabold uppercase">Required</Badge>
                        )}
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-[9px] font-medium border border-slate-200 rounded">{field.category}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{field.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                      <span className="text-[11px] font-mono font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        {field.type}
                      </span>
                      {field.category === 'Custom' && (
                        <Button 
                          onClick={() => handleDeleteField(field.key)}
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {getFilteredFields().length === 0 && (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                    <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No active fields detected</p>
                    <p className="text-xs text-slate-500 mt-1">Try changing your search filter or add a custom indicator.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add custom element to Schema */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Append Custom Metadata Descriptor
              </CardTitle>
              <CardDescription>Interactively introduce institutional properties to standard-template envelopes.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddField} className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Field Label (friendly name)</label>
                  <Input 
                    type="text" 
                    value={newField.label}
                    onChange={(e) => setNewField({...newField, label: e.target.value})}
                    placeholder="e.g. Assessor Signature ID"
                    required
                    className="h-10 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Schema Key (CamelCase)</label>
                  <Input 
                    type="text" 
                    value={newField.key}
                    onChange={(e) => setNewField({...newField, key: e.target.value})}
                    placeholder="e.g. assessorSignatureId"
                    required
                    className="h-10 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Value Format Type</label>
                  <Select 
                    value={newField.type} 
                    onValueChange={(val: any) => setNewField({...newField, type: val})}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String (Text)</SelectItem>
                      <SelectItem value="number">Number (Integer / Float)</SelectItem>
                      <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                      <SelectItem value="date">Date Block</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Field Validation Policy</label>
                  <div className="flex items-center gap-4 h-10 border border-slate-200 rounded-lg px-3 bg-white">
                    <input 
                      type="checkbox" 
                      id="field_req"
                      checked={!!newField.required}
                      onChange={(e) => setNewField({...newField, required: e.target.checked})}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0" 
                    />
                    <label htmlFor="field_req" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Mark as strictly MANDATORY</label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Property Description</label>
                  <Input 
                    type="text" 
                    value={newField.description}
                    onChange={(e) => setNewField({...newField, description: e.target.value})}
                    placeholder="Clear description explaining what this value holds..."
                    className="h-10 text-sm text-slate-900"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold gap-2">
                    <Plus className="h-4 w-4" />
                    Append to Standard
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Outbound JSON Schema Preview */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-950 text-slate-100 rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 font-mono">
                  <Settings className="h-4 w-4 text-emerald-400 rotate-90" />
                  JSON_SCHEMA_OUT
                </CardTitle>
                <Button 
                  onClick={copyToClipboard}
                  variant="ghost" 
                  className="h-8 text-[11px] text-emerald-400 font-mono hover:text-emerald-300 hover:bg-slate-900 px-3 bg-slate-900 border border-emerald-500/20"
                >
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {copied ? 'Copied!' : 'Copy Schematics'}
                </Button>
              </div>
              <CardDescription className="text-slate-400 text-xs mt-1">Exportable raw drafting protocol schema complying with draft-07 standards.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-4 bg-slate-900 text-slate-300 text-[11px] font-mono overflow-y-auto leading-relaxed max-h-[580px] rounded-b-xl select-all border border-t-0 border-slate-950">
                {generateSchemaJson()}
              </pre>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
