import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

type Product = {
  id: string;
  name: string;
  category: string;
  supplier: string;
  region: string;
  status: 'Verified' | 'In review' | 'Needs evidence';
  emissions: number;
  progress: number;
  color: string;
  batch: string;
  material: string;
};

type ChatMessage = { role: 'assistant' | 'user'; text: string; sources?: string[] };

const DEMO_PRODUCTS: Product[] = [
  { id: 'PRD-2048', name: 'Arcline utility overshirt', category: 'Apparel · Outerwear', supplier: 'Mirae Textile Works', region: 'IN · Tamil Nadu', status: 'Verified', emissions: 18.42, progress: 94, color: '#c2d6a4', batch: 'LOT-CTN-2408', material: 'Regenerative cotton · 68%' },
  { id: 'PRD-1931', name: 'Form knit everyday tee', category: 'Apparel · Basics', supplier: 'Northstar Spinning Co.', region: 'IN · Gujarat', status: 'In review', emissions: 9.76, progress: 71, color: '#e7bd92', batch: 'LOT-ORG-1182', material: 'Organic cotton · 100%' },
  { id: 'PRD-1830', name: 'Terrain recycled shell', category: 'Apparel · Performance', supplier: 'Alpine Loop Materials', region: 'TW · Taichung', status: 'Verified', emissions: 24.11, progress: 88, color: '#b9c9e4', batch: 'LOT-RPET-7731', material: 'Recycled nylon · 82%' },
  { id: 'PRD-1712', name: 'Studio relaxed trouser', category: 'Apparel · Bottoms', supplier: 'Mirae Textile Works', region: 'IN · Tamil Nadu', status: 'Needs evidence', emissions: 15.08, progress: 52, color: '#ddc6d1', batch: 'LOT-LIN-0544', material: 'European flax linen · 55%' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly http = inject(HttpClient);
  readonly apiBase = ((window as Window & { TRACELENS_API_BASE?: string }).TRACELENS_API_BASE ?? '').replace(/\/$/, '');
  readonly products = signal<Product[]>(DEMO_PRODUCTS);
  readonly activeView = signal<'overview' | 'products' | 'suppliers' | 'impact'>('overview');
  readonly query = signal('');
  readonly isLight = signal(false);
  readonly isThinking = signal(false);
  readonly toast = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly showNewProduct = signal(false);
  readonly newProductName = signal('');
  readonly newProductMaterial = signal('');
  readonly chatInput = signal('');
  readonly messages = signal<ChatMessage[]>([
    { role: 'assistant', text: 'Hi Jatin. I’m your impact analyst. Ask me about a product footprint, missing evidence, or where to focus next.', sources: ['DEMO CONTEXT'] },
  ]);
  readonly filteredProducts = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter((item) => `${item.name} ${item.id} ${item.supplier} ${item.status}`.toLowerCase().includes(q));
  });
  readonly chartBars = [
    { name: 'Cotton', a: 60, b: 42 }, { name: 'Synthetics', a: 44, b: 39 },
    { name: 'Dyes', a: 32, b: 28 }, { name: 'Shipping', a: 28, b: 35 },
    { name: 'Packaging', a: 16, b: 20 }, { name: 'Other', a: 22, b: 18 },
  ];

  constructor() {
    this.http.get<{ products: Product[] }>(`${this.apiBase}/api/products`).subscribe({
      next: (response) => { if (response.products?.length) this.products.set(response.products); },
      error: () => {},
    });
  }

  navTo(view: 'overview' | 'products' | 'suppliers' | 'impact') { this.activeView.set(view); }
  toggleTheme() { this.isLight.update((value) => !value); }
  openProduct(product: Product) { this.selectedProduct.set(product); }
  closeProduct() { this.selectedProduct.set(null); }
  showToast(message: string) {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(''), 2800);
  }

  async addProduct() {
    const name = this.newProductName().trim();
    if (!name) return;
    const item: Product = {
      id: `PRD-${Math.floor(2000 + Math.random() * 7000)}`,
      name,
      category: 'Apparel · New product',
      supplier: 'Supplier to be assigned',
      region: '—',
      status: 'Needs evidence',
      emissions: 0,
      progress: 12,
      color: '#c4b9db',
      batch: 'BATCH-PENDING',
      material: this.newProductMaterial().trim() || 'Material not added',
    };
    try {
      const response = await firstValueFrom(this.http.post<{ product: Product }>(`${this.apiBase}/api/products`, { name, material: item.material }));
      this.products.update((items) => [response.product, ...items]);
    } catch {
      this.products.update((items) => [item, ...items]);
    }
    this.newProductName.set('');
    this.newProductMaterial.set('');
    this.showNewProduct.set(false);
    this.showToast(this.apiBase ? 'Product saved to your traceability workspace.' : 'Product added to this demo session.');
  }

  exportCsv() {
    const rows = [['Product ID', 'Product', 'Supplier', 'Region', 'Status', 'Demo CO2e (kg)'], ...this.filteredProducts().map((p) => [p.id, p.name, p.supplier, p.region, p.status, String(p.emissions)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tracelens-demo-impact.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    this.showToast('Demo portfolio exported as CSV.');
  }

  async ask(text = this.chatInput()) {
    const question = text.trim();
    if (!question || this.isThinking()) return;
    this.messages.update((items) => [...items, { role: 'user', text: question }]);
    this.chatInput.set('');
    this.isThinking.set(true);
    try {
      const response = await firstValueFrom(this.http.post<{ answer: string; sources?: string[] }>(`${this.apiBase}/api/ai/insights`, {
        question,
        products: this.products().slice(0, 8).map(({ id, name, supplier, status, emissions, batch, material }) => ({ id, name, supplier, status, emissions, batch, material })),
      }));
      this.messages.update((items) => [...items, { role: 'assistant', text: response.answer, sources: response.sources ?? ['DEMO DATA'] }]);
    } catch {
      this.messages.update((items) => [...items, { role: 'assistant', text: this.localAnswer(question), sources: ['DEMO DATA'] }]);
    } finally {
      this.isThinking.set(false);
      setTimeout(() => document.querySelector('.chat-scroll')?.scrollTo({ top: 99999, behavior: 'smooth' }), 0);
    }
  }

  private localAnswer(question: string) {
    const q = question.toLowerCase();
    if (/missing|evidence|verify|verified/.test(q)) return 'The Studio relaxed trouser has the largest evidence gap in this demo set at 52% completeness. Its linen batch LOT-LIN-0544 is missing a transport record and a supplier document. Ask the supplier for those two records before treating the footprint as decision-ready.';
    if (/reduce|highest|hotspot|impact|emission|carbon/.test(q)) return 'In the demo data, the Terrain recycled shell has the largest product footprint at 24.11 kg CO2e. Compare its material and transport records before choosing a reduction. These figures are illustrative demo values, not measured results.';
    if (/supplier|mirae/.test(q)) return 'Mirae Textile Works appears on two demo products. Consolidating evidence requests for that supplier could close multiple traceability gaps at once. The sample data does not include verified facility audit results.';
    return 'I can summarize the demo portfolio, flag missing evidence, or compare product-level carbon estimates. Demo values are illustrative; connect the backend to MongoDB, Climatiq, and an AI provider for live, source-grounded analysis.';
  }
}
