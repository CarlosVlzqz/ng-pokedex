import { Component, inject, signal, OnInit, HostListener, computed } from '@angular/core';
import { PokemonService, PokemonListItem } from '../../services/pokemon';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A890F0', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705848',
  steel: '#B7B7CE', fairy: '#D685AD'
};

export const ALL_TYPES = Object.keys(TYPE_COLORS);

@Component({
  selector: 'app-pokemon-list',
  imports: [RouterLink],
  templateUrl: './pokemon-list.html',
  styleUrl: './pokemon-list.css',
})
export class PokemonList implements OnInit {
  private pokemonService = inject(PokemonService);

  private pokemons = signal<PokemonListItem[]>([]);
  private allPokemons = signal<PokemonListItem[]>([]);
  private typedPokemons = signal<PokemonListItem[] | null>(null);

  searchQuery = signal<string>('');
  selectedTypes = signal<string[]>([]);
  dropdownOpen = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isLoadingMore = signal<boolean>(false);
  isLoadingType = signal<boolean>(false);

  readonly allTypes = ALL_TYPES;
  readonly typeColors = TYPE_COLORS;

  private offset = 0;
  private readonly limit = 50;
  private readonly maxPokemon = 493;
  private hasMore = true;

  hasTypeFilter = computed(() => this.selectedTypes().length > 0);
  hasAnyFilter = computed(() => this.selectedTypes().length > 0 || !!this.searchQuery());

  renderedPokemons = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const base = this.typedPokemons() ?? this.pokemons();
    if (!query) return base;
    const searchBase = this.typedPokemons() ? base : this.allPokemons();
    return searchBase.filter(p => {
      const id = this.getPokemonId(p.url);
      return p.name.toLowerCase().includes(query) || id.includes(query);
    });
  });

  ngOnInit() {
    this.loadInitial();
    this.loadAllForSearch();
  }

  loadInitial() {
    this.isLoading.set(true);
    this.pokemonService.getPokemonList(this.limit, 0).subscribe({
      next: (data) => {
        console.log(data)
        this.pokemons.set(data);
        this.offset = this.limit;
        this.isLoading.set(false);
      },
      error: (err) => { console.error(err); this.isLoading.set(false); }
    });
  }

  loadAllForSearch() {
    this.pokemonService.getPokemonList(this.maxPokemon, 0).subscribe({
      next: (data) => this.allPokemons.set(data),
      error: (err) => console.error('Failed to load search data:', err)
    });
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  toggleDropdown() {
    this.dropdownOpen.update(v => !v);
  }

  closeDropdown() {
    this.dropdownOpen.set(false);
  }

  isTypeSelected(type: string): boolean {
    return this.selectedTypes().includes(type);
  }

  toggleType(typeName: string) {
    const current = this.selectedTypes();
    const next = current.includes(typeName)
      ? current.filter(t => t !== typeName)
      : [...current, typeName];
    this.selectedTypes.set(next);
    this.applyTypeFilter(next);
  }

  removeType(typeName: string) {
    const next = this.selectedTypes().filter(t => t !== typeName);
    this.selectedTypes.set(next);
    this.applyTypeFilter(next);
  }

  clearTypes() {
    this.selectedTypes.set([]);
    this.typedPokemons.set(null);
  }

  private applyTypeFilter(types: string[]) {
    if (types.length === 0) {
      this.typedPokemons.set(null);
      return;
    }
    this.isLoadingType.set(true);
    const requests = types.map(t => this.pokemonService.getPokemonByType(t, this.maxPokemon));
    forkJoin(requests).subscribe({
      next: (results) => {
        const seen = new Set<string>();
        const union: PokemonListItem[] = [];
        for (const list of results) {
          for (const p of list) {
            if (!seen.has(p.name)) { seen.add(p.name); union.push(p); }
          }
        }
        union.sort((a, b) => parseInt(this.getPokemonId(a.url)) - parseInt(this.getPokemonId(b.url)));
        this.typedPokemons.set(union);
        this.isLoadingType.set(false);
      },
      error: (err) => { console.error(err); this.isLoadingType.set(false); }
    });
  }

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] || '#777';
  }

  loadMore() {
    if (this.isLoadingMore() || !this.hasMore || this.searchQuery() || this.hasTypeFilter()) return;
    if (this.offset >= this.maxPokemon) { this.hasMore = false; return; }

    const currentLimit = Math.min(this.limit, this.maxPokemon - this.offset);
    this.isLoadingMore.set(true);
    this.pokemonService.getPokemonList(currentLimit, this.offset).subscribe({
      next: (data) => {
        this.pokemons.update(current => [...current, ...data]);
        this.offset += data.length;
        if (this.offset >= this.maxPokemon || data.length < currentLimit) this.hasMore = false;
        this.isLoadingMore.set(false);
      },
      error: (err) => { console.error(err); this.isLoadingMore.set(false); }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.hasAnyFilter()) return;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPos = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    if (windowHeight + scrollPos >= documentHeight - 300) this.loadMore();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.type-dropdown-wrapper')) {
      this.dropdownOpen.set(false);
    }
  }

  getPokemonId(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 2];
  }

  getPokemonIdPadded(url: string): string {
    return this.getPokemonId(url).padStart(3, '0');
  }

  getPokemonImage(url: string): string {
    const id = this.getPokemonId(url);
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  getCardAuraColor(): string {
    const types = this.selectedTypes();
    if (types.length > 0) {
      return this.getTypeColor(types[0]);
    }
    return 'rgba(255, 255, 255, 0.4)';
  }

  getPokemonTypeColor(pokemon: PokemonListItem): string {
    if (pokemon.types && pokemon.types.length > 0)
      return this.getTypeColor(pokemon.types[0]);
    return 'rgba(255, 255, 255, 0.4)';
  }
}