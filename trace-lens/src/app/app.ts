import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

type Evidence = { _id?: string; kind: string; title: string; reference?: string; notes?: string; addedAt?: string };
type Product = {
  id: string; name: string; category: string; supplier: string; region: string; receiver: string;
  status: 'Verified' | 'In review' | 'Needs evidence'; emissions: number; emissionsSource?: string;
  progress: number; color: string; batch: string; material: string; evidence?: Evidence[];
};
type Supplier = { name: string; region: string; products: number; averageCoverage: number; evidenceItems: number; footprintKg: number };
type Analytics = { productCount: number; footprintKg: number; coverage: number; supplierCount: number; openGaps: number; verified: number; mode: string };
type ChatMessage = { role: 'assistant' | 'user'; text: string; sources?: string[]; mode?: string };
type Factor = { id: string; name: string; category?: string; source?: string; year?: number; unit_type?: string };

const EMPTY_ANALYTICS: Analytics = { productCount: 0, footprintKg: 0, coverage: 0, supplierCount: 0, openGaps: 0, verified: 0, mode: 'offline' };

@Component({
  selector: 'app-root', standalone: true, imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.html', styleUrl: './app.scss',
})
export class App {
  private readonly http = inject(HttpClient);
  readonly apiBase = ((window as Window & { TRACELENS_API_BASE?: string }).TRACELENS_API_BASE ?? '').replace(/\/$/, '');
  readonly apiState = signal<'connecting' | 'online' | 'offline'>('connecting');
  readonly aiMode = signal<'checking' | 'live' | 'demo' | 'offline'>('checking');
  readonly databaseMode = signal('checking');
  readonly canWrite = signal(false);
  readonly climatiqEnabled = signal(false);
  readonly isSignedIn = signal(false);
  readonly showLogin = signal(false);
  readonly authMode = signal<'login' | 'signup'>('login');
  readonly signupAvailable = signal(false);
  readonly authEmail = signal('');
  readonly authPassword = signal('');
  readonly authSetupKey = signal('');
  readonly authRole = signal('');
  readonly authBusy = signal(false);
  readonly authError = signal('');
  readonly factorQuery = signal('');
  readonly factorResults = signal<Factor[]>([]);
  readonly selectedFactorId = signal('');
  readonly factorParameters = signal('{\n  \n}');
  readonly products = signal<Product[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly analytics = signal<Analytics>(EMPTY_ANALYTICS);
  readonly activeView = signal<'overview' | 'products' | 'suppliers' | 'impact'>('overview');
  readonly query = signal('');
  readonly isLight = signal(false);
  readonly isThinking = signal(false);
  readonly busy = signal(false);
  readonly toast = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly showNewProduct = signal(false);
  readonly newProductName = signal('');
  readonly newProductMaterial = signal('');
  readonly newProductSupplier = signal('');
  readonly newProductRegion = signal('');
  readonly newProductReceiver = signal('');
  readonly evidenceTitle = signal('');
  readonly evidenceKind = signal('material');
  readonly evidenceReference = signal('');
  readonly editName = signal('');
  readonly editMaterial = signal('');
  readonly editSupplier = signal('');
  readonly editRegion = signal('');
  readonly editReceiver = signal('');
  readonly editCategory = signal('');
  readonly editBatch = signal('');
  readonly chatInput = signal('');
  readonly messages = signal<ChatMessage[]>([
    { role: 'assistant', text: 'I analyze the product, supplier, evidence, and impact records connected to this workspace. Ask me what needs attention.', sources: [] },
  ]);
  readonly filteredProducts = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter((p) => `${p.name} ${p.id} ${p.supplier} ${p.receiver} ${p.status} ${p.material} ${p.batch}`.toLowerCase().includes(q));
  });
  readonly chartBars = computed(() => {
    const groups = new Map<string, number>();
    for (const product of this.products()) {
      const amount = Number(product.emissions) || 0;
      if (amount <= 0) continue;
      const material = product.material?.trim();
      const group = material && material !== '—' && material !== 'Material not added'
        ? material.split(/[·,]/)[0].trim()
        : '—';
      groups.set(group, (groups.get(group) || 0) + amount);
    }
    const top = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(...top.map(([, amount]) => amount), 1);
    return top.map(([name, amount]) => ({ name, amount, height: Math.max(3, Math.round(amount / max * 100)) }));
  });

  constructor() {
    try { this.isSignedIn.set(Boolean(localStorage.getItem('tracelens-owner-token'))); } catch {}
    void this.refreshWorkspace();
  }

  private apiUrl(path: string) { return `${this.apiBase}${path}`; }

  async refreshWorkspace() {
    this.apiState.set('connecting');
    try {
      const [status, productResponse, analytics, suppliers] = await Promise.all([
        firstValueFrom(this.http.get<{ api: string; ai: 'live' | 'demo'; database: string; writeAuth: boolean; climatiq: boolean }>(this.apiUrl('/api/status'))),
        firstValueFrom(this.http.get<{ products: Product[]; mode: string }>(this.apiUrl('/api/products'))),
        firstValueFrom(this.http.get<Analytics>(this.apiUrl('/api/analytics'))),
        firstValueFrom(this.http.get<{ suppliers: Supplier[] }>(this.apiUrl('/api/suppliers'))),
      ]);
      this.apiState.set(status.api === 'online' ? 'online' : 'offline');
      this.aiMode.set(status.ai);
      this.databaseMode.set(status.database);
      this.canWrite.set(status.writeAuth);
      this.climatiqEnabled.set(status.climatiq);
      this.products.set(productResponse.products || []);
      this.analytics.set(analytics);
      this.suppliers.set(suppliers.suppliers || []);
    } catch {
      this.apiState.set('offline'); this.aiMode.set('offline'); this.databaseMode.set('offline'); this.canWrite.set(false); this.climatiqEnabled.set(false);
      this.showToast('API unavailable. Start the TraceLens server and reconnect.');
    }
  }

  navTo(view: 'overview' | 'products' | 'suppliers' | 'impact') { this.activeView.set(view); }
  toggleTheme() { this.isLight.update((value) => !value); }
  openProduct(product: Product) {
    this.selectedProduct.set(product); this.editName.set(product.name); this.editMaterial.set(product.material);
    this.editSupplier.set(product.supplier); this.editRegion.set(product.region); this.editReceiver.set(product.receiver || '—');
    this.editCategory.set(product.category); this.editBatch.set(product.batch);
  }
  closeProduct() { this.selectedProduct.set(null); }
  showToast(message: string) { this.toast.set(message); window.setTimeout(() => this.toast.set(''), 3200); }

  authOptions() {
    const token = localStorage.getItem('tracelens-owner-token');
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  async openLogin() {
    this.authMode.set('login');
    this.authError.set('');
    this.showLogin.set(true);
    try {
      const setup = await firstValueFrom(this.http.get<{ signupAvailable: boolean }>(this.apiUrl('/api/auth/setup-status')));
      this.signupAvailable.set(setup.signupAvailable);
      if (setup.signupAvailable) this.authMode.set('signup');
    } catch { this.signupAvailable.set(false); }
  }

  switchAuthMode(mode: 'login' | 'signup') {
    if (mode === 'signup' && !this.signupAvailable()) return;
    this.authMode.set(mode);
    this.authError.set('');
    this.authPassword.set('');
    this.authSetupKey.set('');
    this.authRole.set('');
  }

  startAccountSignup() {
    localStorage.removeItem('tracelens-owner-token');
    this.isSignedIn.set(false);
    this.authEmail.set('');
    this.authPassword.set('');
    this.authSetupKey.set('');
    this.authRole.set('');
    this.authError.set('');
    this.authMode.set('signup');
  }

  private completeSignIn(token: string) {
    localStorage.setItem('tracelens-owner-token', token);
    this.isSignedIn.set(true);
    this.showLogin.set(false);
    this.authPassword.set('');
    this.authSetupKey.set('');
    this.authError.set('');
  }

  async signIn() {
    const email = this.authEmail().trim().toLowerCase();
    const password = this.authPassword();
    if (!email || !password || this.authBusy()) return;
    this.authBusy.set(true);
    this.authError.set('');
    try {
      const result = await firstValueFrom(this.http.post<{ token: string }>(this.apiUrl('/api/auth/login'), { email, password }));
      this.completeSignIn(result.token);
      this.showToast('Workspace editing unlocked for this browser.');
    } catch (error: any) { this.authError.set(error?.error?.error || 'Sign-in failed. Check your details and connection.'); }
    finally { this.authBusy.set(false); }
  }

  async signUp() {
    const email = this.authEmail().trim().toLowerCase();
    const password = this.authPassword();
    const setupCode = this.authSetupKey();
    const role = this.authRole();
    if (!email || !password || !setupCode || !role || this.authBusy()) return;
    if (password.length < 12) { this.authError.set('Choose a password with at least 12 characters.'); return; }
    this.authBusy.set(true);
    this.authError.set('');
    try {
      const result = await firstValueFrom(this.http.post<{ token: string }>(this.apiUrl('/api/auth/signup'), { email, password, setupCode, role }));
      this.completeSignIn(result.token);
      this.showToast('Account created. You can now access the shared workspace.');
    } catch (error: any) { this.authError.set(error?.error?.error || 'Could not create the owner account. Check the setup key and try again.'); }
    finally { this.authBusy.set(false); }
  }

  signOut() {
    localStorage.removeItem('tracelens-owner-token'); this.isSignedIn.set(false); this.showToast('Signed out. Workspace stays in read-only mode.');
  }

  openCreateProduct() {
    if (this.canWrite() && !this.isSignedIn()) { void this.openLogin(); return; }
    if (!this.canWrite()) { this.showToast('Workspace editing is not configured on this API.'); return; }
    this.showNewProduct.set(true);
  }

  async addProduct() {
    const name = this.newProductName().trim();
    if (!name || this.busy()) return;
    this.busy.set(true);
    try {
      const response = await firstValueFrom(this.http.post<{ product: Product }>(this.apiUrl('/api/products'), {
        name, material: this.newProductMaterial().trim(), supplier: this.newProductSupplier().trim(), region: this.newProductRegion().trim(), receiver: this.newProductReceiver().trim(),
      }, this.authOptions()));
      this.products.update((items) => [response.product, ...items]);
      this.showNewProduct.set(false); this.newProductName.set(''); this.newProductMaterial.set(''); this.newProductSupplier.set(''); this.newProductRegion.set(''); this.newProductReceiver.set('');
      await this.refreshWorkspace(); this.showToast('Product saved to the workspace.');
    } catch (error: any) { if (error?.status === 401) { void this.openLogin(); this.showToast('Sign in to save workspace changes.'); } else this.showToast(error?.error?.error || 'Could not save the product. Check the API connection and try again.'); }
    finally { this.busy.set(false); }
  }

  async deleteProduct(product: Product) {
    if (!window.confirm(`Delete ${product.name} and its linked evidence?`)) return;
    try {
      await firstValueFrom(this.http.delete(this.apiUrl(`/api/products/${encodeURIComponent(product.id)}`), this.authOptions()));
      this.closeProduct(); await this.refreshWorkspace(); this.showToast('Product passport deleted.');
    } catch (error: any) { if (error?.status === 401) { this.isSignedIn.set(false); localStorage.removeItem('tracelens-owner-token'); void this.openLogin(); } else this.showToast(error?.error?.error || 'Could not delete the product. Check the API connection.'); }
  }

  async saveProduct(product: Product) {
    this.busy.set(true);
    try {
      const response = await firstValueFrom(this.http.patch<{ product: Product }>(this.apiUrl(`/api/products/${encodeURIComponent(product.id)}`), {
        name: this.editName(), category: this.editCategory(), material: this.editMaterial(), supplier: this.editSupplier(), region: this.editRegion(), receiver: this.editReceiver(), batch: this.editBatch(),
      }, this.authOptions()));
      this.selectedProduct.set(response.product); await this.refreshWorkspace();
      const updated = this.products().find((entry) => entry.id === product.id);
      if (updated) this.selectedProduct.set(updated);
      this.showToast('Product passport updated.');
    } catch (error: any) { if (error?.status === 401) { this.isSignedIn.set(false); localStorage.removeItem('tracelens-owner-token'); void this.openLogin(); } else this.showToast(error?.error?.error || 'Could not update this product.'); }
    finally { this.busy.set(false); }
  }

  async addEvidence(product: Product) {
    const title = this.evidenceTitle().trim();
    if (!title || this.busy()) return;
    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.http.post<{ product: Product }>(this.apiUrl(`/api/products/${encodeURIComponent(product.id)}/evidence`), {
        title, kind: this.evidenceKind(), reference: this.evidenceReference().trim(),
      }, this.authOptions()));
      this.evidenceTitle.set(''); this.evidenceReference.set(''); this.selectedProduct.set(result.product);
      await this.refreshWorkspace();
      const updated = this.products().find((entry) => entry.id === product.id);
      if (updated) this.selectedProduct.set(updated);
      this.showToast('Evidence record added.');
    } catch (error: any) { if (error?.status === 401) { this.isSignedIn.set(false); localStorage.removeItem('tracelens-owner-token'); void this.openLogin(); } else this.showToast(error?.error?.error || 'Could not add evidence. Check the API connection.'); }
    finally { this.busy.set(false); }
  }

  async searchFactors() {
    const query = this.factorQuery().trim();
    if (!query) return;
    try {
      const response = await firstValueFrom(this.http.get<{ results: Factor[] }>(this.apiUrl(`/api/impact/factors?query=${encodeURIComponent(query)}`)));
      this.factorResults.set(response.results || []);
      if (!response.results?.length) this.showToast('No matching Climatiq factors were found.');
    } catch (error: any) { this.showToast(error?.error?.error || 'Could not search Climatiq factors.'); }
  }

  async estimateImpact(product: Product) {
    let parameters: Record<string, unknown>;
    try { parameters = JSON.parse(this.factorParameters()); }
    catch { this.showToast('Activity parameters must be valid JSON.'); return; }
    try {
      const result = await firstValueFrom(this.http.post<{ co2e: number; co2e_unit: string; source: string }>(this.apiUrl('/api/impact/estimate'), {
        productId: product.id, emissionFactorId: this.selectedFactorId(), parameters,
      }, this.authOptions()));
      this.showToast(`Climatiq estimate: ${result.co2e} ${result.co2e_unit}.`);
      await this.refreshWorkspace();
      const updated = this.products().find((entry) => entry.id === product.id);
      if (updated) this.selectedProduct.set(updated);
    } catch (error: any) { this.showToast(error?.error?.error || 'Could not calculate the Climatiq estimate.'); }
  }

  exportCsv() {
    const rows = [['Product ID', 'Product', 'Supplier', 'Region', 'Receiver / Destination', 'Status', 'Footprint kg CO2e', 'Footprint source', 'Evidence coverage'], ...this.filteredProducts().map((p) => [p.id, p.name, p.supplier, p.region, p.receiver || '—', p.status, String(p.emissions), p.emissionsSource || '', String(p.progress)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'tracelens-products.csv'; anchor.click(); URL.revokeObjectURL(url);
    this.showToast('Current workspace records exported as CSV.');
  }

  async ask(text = this.chatInput()) {
    const question = text.trim();
    if (!question || this.isThinking()) return;
    this.messages.update((items) => [...items, { role: 'user', text: question }]);
    this.chatInput.set(''); this.isThinking.set(true);
    try {
      const response = await firstValueFrom(this.http.post<{ answer: string; sources?: string[]; mode: 'live-ai' | 'demo' }>(this.apiUrl('/api/ai/insights'), { question }));
      this.aiMode.set(response.mode === 'live-ai' ? 'live' : 'demo');
      this.messages.update((items) => [...items, { role: 'assistant', text: response.answer, sources: response.sources ?? [], mode: response.mode }]);
    } catch {
      this.aiMode.set('offline');
      this.messages.update((items) => [...items, { role: 'assistant', text: 'I could not reach the TraceLens API. Start the backend or check its deployment, then try again.', sources: ['API OFFLINE'], mode: 'offline' }]);
    } finally {
      this.isThinking.set(false);
      setTimeout(() => document.querySelector('.chat-scroll')?.scrollTo({ top: 99999, behavior: 'smooth' }), 0);
    }
  }
}
