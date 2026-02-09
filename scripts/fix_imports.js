const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const SRC_DIR = path.join(__dirname, '../src');

// Component Name -> Import Path (relative to src or using alias @)
const IMPORT_MAP = {
    // UI Components
    'Accordion': '@/components/ui/accordion',
    'AccordionItem': '@/components/ui/accordion',
    'AccordionTrigger': '@/components/ui/accordion',
    'AccordionContent': '@/components/ui/accordion',
    'AlertDialog': '@/components/ui/alert-dialog',
    'AlertDialogAction': '@/components/ui/alert-dialog',
    'AlertDialogCancel': '@/components/ui/alert-dialog',
    'AlertDialogContent': '@/components/ui/alert-dialog',
    'AlertDialogDescription': '@/components/ui/alert-dialog',
    'AlertDialogFooter': '@/components/ui/alert-dialog',
    'AlertDialogHeader': '@/components/ui/alert-dialog',
    'AlertDialogTitle': '@/components/ui/alert-dialog',
    'AlertDialogTrigger': '@/components/ui/alert-dialog',
    'Alert': '@/components/ui/alert',
    'AlertDescription': '@/components/ui/alert',
    'AlertTitle': '@/components/ui/alert',
    'AspectRatio': '@/components/ui/aspect-ratio',
    'Avatar': '@/components/ui/avatar',
    'AvatarFallback': '@/components/ui/avatar',
    'AvatarImage': '@/components/ui/avatar',
    'Badge': '@/components/ui/badge',
    'Breadcrumb': '@/components/ui/breadcrumb',
    'BreadcrumbItem': '@/components/ui/breadcrumb',
    'BreadcrumbLink': '@/components/ui/breadcrumb',
    'BreadcrumbList': '@/components/ui/breadcrumb',
    'BreadcrumbPage': '@/components/ui/breadcrumb',
    'BreadcrumbSeparator': '@/components/ui/breadcrumb',
    'Button': '@/components/ui/button',
    'Calendar': '@/components/ui/calendar',
    'Card': '@/components/ui/card',
    'CardContent': '@/components/ui/card',
    'CardDescription': '@/components/ui/card',
    'CardFooter': '@/components/ui/card',
    'CardHeader': '@/components/ui/card',
    'CardTitle': '@/components/ui/card',
    'Carousel': '@/components/ui/carousel',
    'CarouselContent': '@/components/ui/carousel',
    'CarouselItem': '@/components/ui/carousel',
    'CarouselNext': '@/components/ui/carousel',
    'CarouselPrevious': '@/components/ui/carousel',
    'ChartContainer': '@/components/ui/chart',
    'ChartTooltip': '@/components/ui/chart',
    'ChartTooltipContent': '@/components/ui/chart',
    'Checkbox': '@/components/ui/checkbox',
    'Collapsible': '@/components/ui/collapsible',
    'CollapsibleContent': '@/components/ui/collapsible',
    'CollapsibleTrigger': '@/components/ui/collapsible',
    'Command': '@/components/ui/command',
    'CommandDialog': '@/components/ui/command',
    'CommandEmpty': '@/components/ui/command',
    'CommandGroup': '@/components/ui/command',
    'CommandInput': '@/components/ui/command',
    'CommandItem': '@/components/ui/command',
    'CommandList': '@/components/ui/command',
    'CommandSeparator': '@/components/ui/command',
    'CommandShortcut': '@/components/ui/command',
    'ContextMenu': '@/components/ui/context-menu',
    'ContextMenuContent': '@/components/ui/context-menu',
    'ContextMenuItem': '@/components/ui/context-menu',
    'ContextMenuTrigger': '@/components/ui/context-menu',
    'Dialog': '@/components/ui/dialog',
    'DialogContent': '@/components/ui/dialog',
    'DialogDescription': '@/components/ui/dialog',
    'DialogFooter': '@/components/ui/dialog',
    'DialogHeader': '@/components/ui/dialog',
    'DialogTitle': '@/components/ui/dialog',
    'DialogTrigger': '@/components/ui/dialog',
    'Drawer': '@/components/ui/drawer',
    'DrawerContent': '@/components/ui/drawer',
    'DrawerTrigger': '@/components/ui/drawer',
    'DropdownMenu': '@/components/ui/dropdown-menu',
    'DropdownMenuContent': '@/components/ui/dropdown-menu',
    'DropdownMenuItem': '@/components/ui/dropdown-menu',
    'DropdownMenuLabel': '@/components/ui/dropdown-menu',
    'DropdownMenuSeparator': '@/components/ui/dropdown-menu',
    'DropdownMenuTrigger': '@/components/ui/dropdown-menu',
    'Form': '@/components/ui/form',
    'FormControl': '@/components/ui/form',
    'FormDescription': '@/components/ui/form',
    'FormField': '@/components/ui/form',
    'FormItem': '@/components/ui/form',
    'FormLabel': '@/components/ui/form',
    'FormMessage': '@/components/ui/form',
    'HoverCard': '@/components/ui/hover-card',
    'HoverCardContent': '@/components/ui/hover-card',
    'HoverCardTrigger': '@/components/ui/hover-card',
    'Input': '@/components/ui/input',
    'InputOTP': '@/components/ui/input-otp',
    'InputOTPGroup': '@/components/ui/input-otp',
    'InputOTPSlot': '@/components/ui/input-otp',
    'Label': '@/components/ui/label',
    'Menubar': '@/components/ui/menubar',
    'MenubarContent': '@/components/ui/menubar',
    'MenubarItem': '@/components/ui/menubar',
    'MenubarMenu': '@/components/ui/menubar',
    'MenubarTrigger': '@/components/ui/menubar',
    'NavigationMenu': '@/components/ui/navigation-menu',
    'Pagination': '@/components/ui/pagination',
    'PaginationContent': '@/components/ui/pagination',
    'PaginationItem': '@/components/ui/pagination',
    'PaginationLink': '@/components/ui/pagination',
    'PaginationNext': '@/components/ui/pagination',
    'PaginationPrevious': '@/components/ui/pagination',
    'Popover': '@/components/ui/popover',
    'PopoverContent': '@/components/ui/popover',
    'PopoverTrigger': '@/components/ui/popover',
    'Progress': '@/components/ui/progress',
    'RadioGroup': '@/components/ui/radio-group',
    'RadioGroupItem': '@/components/ui/radio-group',
    'ResizablePanel': '@/components/ui/resizable',
    'ResizablePanelGroup': '@/components/ui/resizable',
    'ScrollArea': '@/components/ui/scroll-area',
    'ScrollBar': '@/components/ui/scroll-area',
    'Select': '@/components/ui/select',
    'SelectContent': '@/components/ui/select',
    'SelectItem': '@/components/ui/select',
    'SelectTrigger': '@/components/ui/select',
    'SelectValue': '@/components/ui/select',
    'Separator': '@/components/ui/separator',
    'Sheet': '@/components/ui/sheet',
    'SheetContent': '@/components/ui/sheet',
    'SheetDescription': '@/components/ui/sheet',
    'SheetHeader': '@/components/ui/sheet',
    'SheetTitle': '@/components/ui/sheet',
    'SheetTrigger': '@/components/ui/sheet',
    'Skeleton': '@/components/ui/skeleton',
    'Slider': '@/components/ui/slider',
    'Switch': '@/components/ui/switch',
    'Table': '@/components/ui/table',
    'TableBody': '@/components/ui/table',
    'TableCell': '@/components/ui/table',
    'TableHead': '@/components/ui/table',
    'TableHeader': '@/components/ui/table',
    'TableRow': '@/components/ui/table',
    'Tabs': '@/components/ui/tabs',
    'TabsContent': '@/components/ui/tabs',
    'TabsList': '@/components/ui/tabs',
    'TabsTrigger': '@/components/ui/tabs',
    'Textarea': '@/components/ui/textarea',
    'Toast': '@/components/ui/toast',
    'Toaster': '@/components/ui/sonner', // Usually Sonner
    'Toggle': '@/components/ui/toggle',
    'ToggleGroup': '@/components/ui/toggle-group',
    'ToggleGroupItem': '@/components/ui/toggle-group',
    'Tooltip': '@/components/ui/tooltip',
    'TooltipContent': '@/components/ui/tooltip',
    'TooltipProvider': '@/components/ui/tooltip',
    'TooltipTrigger': '@/components/ui/tooltip',

    // Specific Components
    'TaskCard': '@/components/tasks/TaskCard',
    'TaskForm': '@/components/tasks/TaskForm',
    'TaskFilters': '@/components/tasks/TaskFilters',
    'KanbanBoard': '@/components/tasks/KanbanBoard',
    'AITaskManager': '@/components/tasks/AITaskManager',
    'ClientIntelligenceForm': '@/components/inteligencia/ClientIntelligenceForm',
    'ClientIntelligenceList': '@/components/inteligencia/ClientIntelligenceList',
    'GuidedTour': '@/components/help/GuidedTour',
    'HelpButton': '@/components/help/HelpButton',
    'AuditStats': '@/components/rbac/audit/AuditStats', // Ambiguous, defaults to RBAC one
    'AuditFilters': '@/components/rbac/audit/AuditFilters',
    'AuditLogTable': '@/components/rbac/audit/AuditLogTable',
    'RBACLogTable': '@/components/rbac/audit/RBACLogTable',
    'RBACLogStats': '@/components/rbac/audit/RBACLogStats',
    'RBACLogFilters': '@/components/rbac/audit/RBACLogFilters',
    'IntegrationModal': '@/components/integrations/IntegrationModal',
    'RegimentEditor': '@/components/regimento/RegimentEditor',
    'RegimentViewer': '@/components/regimento/RegimentViewer',
    'OnboardingTour': '@/components/onboarding/OnboardingTour',
    'OnboardingChecklist': '@/components/onboarding/OnboardingChecklist',
    'ContextualTips': '@/components/onboarding/ContextualTips',
    'JobDescriptionViewer': '@/components/job-description/JobDescriptionViewer',
    'ActionItem': '@/components/planoacao/ActionItem',
    'GeneratedPlanText': '@/components/planoacao/GeneratedPlanText',
    'EnhancedPDFPreview': '@/components/planoacao/EnhancedPDFPreview',
    'AdminViewBanner': '@/components/shared/AdminViewBanner',

    // Page Components (sometimes imported)
    'DocumentacaoRBAC': '@/pages/documentos/DocumentacaoRBAC'
};

async function processFile(filePath) {
    let content = await readFile(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    // Regex for: import { X, Y } from "" OR import X from ""
    // We capture the imports and the quote style
    const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+(['"])(\3);/g;

    content = content.replace(importRegex, (match, namedImports, defaultImport, quote) => {
        // If it's not empty string, ignore (though regex matches empty quotes only due to (\3) which is empty? No, \3 is the quote char. \3 is backref to group 3.
        // Wait, regular expression for empty string is (['"])\1
        // My regex above: (['"])(\3) -> \3 is group 3 (the quote). So it matches "" or ''.

        let targetPath = null;

        if (defaultImport) {
            targetPath = IMPORT_MAP[defaultImport];
            if (!targetPath && defaultImport.startsWith('Select')) targetPath = '@/components/ui/select'; // Fallback
        } else if (namedImports) {
            const imports = namedImports.split(',').map(s => s.trim()).filter(Boolean);
            // Try to find a match for the first import, assuming they come from the same file
            // (e.g. Card, CardHeader from same file)
            for (const imp of imports) {
                if (IMPORT_MAP[imp]) {
                    targetPath = IMPORT_MAP[imp];
                    break;
                }
            }
        }

        if (targetPath) {
            modified = true;
            console.log(`Fixing in ${path.basename(filePath)}: ${match} -> from "${targetPath}"`);
            if (defaultImport) {
                return `import ${defaultImport} from "${targetPath}";`;
            } else {
                return `import { ${namedImports} } from "${targetPath}";`;
            }
        } else {
            console.log(`Could not resolve import in ${path.basename(filePath)}: ${match}`);
            return match; // Keep as is
        }
    });

    // Special handling for AuditLogs.jsx which needs admin/audit components
    if (filePath.includes('AuditLogs.jsx')) {
        content = content.replace(/import\s+(\w+)\s+from\s+['"]@\/components\/rbac\/audit\/AuditLogViewer['"]/g, 'import $1 from "@/components/admin/audit/AuditLogViewer"');
        content = content.replace(/import\s+(\w+)\s+from\s+['"]@\/components\/rbac\/audit\/AuditLogTable['"]/g, 'import $1 from "@/components/admin/audit/AuditLogTable"');
        // Correct empty ones too if they resolved to RBAC default
    }

    if (modified) {
        await writeFile(filePath, content, 'utf8');
    }
}

async function walk(dir) {
    const files = await readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
            await walk(filePath);
        } else if (stats.isFile() && (file.endsWith('.jsx') || file.endsWith('.js'))) {
            await processFile(filePath);
        }
    }
}

walk(SRC_DIR).then(() => console.log('Done!')).catch(console.error);
