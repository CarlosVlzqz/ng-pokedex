import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

export interface PokemonListItem {
  name: string;
  url: string;
  types: string[];
}

export interface PokemonDetail {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    front_shiny: string;
    other: {
      'official-artwork': {
        front_default: string;
        front_shiny: string;
      }
    }
  };
  types: Array<{ type: { name: string; url: string } }>;
  stats: Array<{ base_stat: number; effort: number; stat: { name: string } }>;
  height: number;
  weight: number;
}

export interface PokemonSpecies {
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
  genera: Array<{
    genus: string;
    language: { name: string };
  }>;
  names: Array<{
    name: string;
    language: { name: string };
  }>;
  evolution_chain: {
    url: string;
  };
}

export interface DamageRelations {
  double_damage_from: Array<{ name: string; url: string }>;
  half_damage_from: Array<{ name: string; url: string }>;
  no_damage_from: Array<{ name: string; url: string }>;
  double_damage_to: Array<{ name: string; url: string }>;
  half_damage_to: Array<{ name: string; url: string }>;
  no_damage_to: Array<{ name: string; url: string }>;
}

export interface TypeDetails {
  id: number;
  name: string;
  damage_relations: DamageRelations;
  pokemon: Array<{ pokemon: { name: string; url: string } }>;
}

export interface EvolutionChainNode {
  species: { name: string; url: string };
  evolution_details: Array<{
    trigger: { name: string };
    item?: { name: string };
    min_level?: number;
    min_happiness?: number;
    held_item?: { name: string };
  }>;
  evolves_to: EvolutionChainNode[];
}

export interface EvolutionChain {
  chain: EvolutionChainNode;
}

@Injectable({
  providedIn: 'root',
})
export class PokemonService {
  private http = inject(HttpClient);
  private baseUrl = 'https://pokeapi.co/api/v2';

  private cache = {
    detail: new Map<string | number, PokemonDetail>(),
    species: new Map<string | number, PokemonSpecies>(),
    evolution: new Map<string, EvolutionChain>(),
    types: new Map<string | number, TypeDetails>(),
    typePokemon: new Map<string, PokemonListItem[]>(),
  };

  getBasicPokemonList(limit: number = 151, offset: number = 0): Observable<PokemonListItem[]> {
    return this.http.get<PokemonListResponse>(`${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`)
      .pipe(map(response => response.results.map(p => ({ ...p, types: [] }))));
  }

  getPokemonList(limit: number = 151, offset: number = 0): Observable<PokemonListItem[]> {
    return this.http.get<PokemonListResponse>(`${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`).pipe(
      switchMap(response => {
        if (response.results.length === 0) return of([]);
        const detailRequests = response.results.map(p => this.getPokemonDetail(p.name));
        return forkJoin(detailRequests);
      }),
      map((details: PokemonDetail[]) => details.map(d => ({
        name: d.name,
        url: `${this.baseUrl}/pokemon/${d.id}/`,
        types: d.types.map(t => t.type.name)
      })))
    );
  }

  getPokemonDetail(nameOrId: string | number): Observable<PokemonDetail> {
    const cached = this.cache.detail.get(nameOrId);
    if (cached) return of(cached);

    return this.http.get<PokemonDetail>(`${this.baseUrl}/pokemon/${nameOrId}`).pipe(
      tap(data => {
        this.cache.detail.set(data.id, data);
        this.cache.detail.set(data.name, data);
      })
    );
  }

  getPokemonSpecies(nameOrId: string | number): Observable<PokemonSpecies> {
    const cached = this.cache.species.get(nameOrId);
    if (cached) return of(cached);

    return this.http.get<PokemonSpecies>(`${this.baseUrl}/pokemon-species/${nameOrId}`).pipe(
      tap(data => {
        this.cache.species.set(nameOrId, data);
      })
    );
  }

  getTypeDetails(nameOrId: string | number): Observable<TypeDetails> {
    const cached = this.cache.types.get(nameOrId);
    if (cached) return of(cached);

    return this.http.get<TypeDetails>(`${this.baseUrl}/type/${nameOrId}`).pipe(
      tap(data => {
        this.cache.types.set(data.id, data);
        this.cache.types.set(data.name, data);
      })
    );
  }

  getPokemonByType(typeName: string, maxId: number = 493): Observable<PokemonListItem[]> {
    const cacheKey = `${typeName}:${maxId}`;
    const cached = this.cache.typePokemon.get(cacheKey);
    if (cached) return of(cached);

    return this.getTypeDetails(typeName).pipe(
      map(typeData => {
        return typeData.pokemon
          .map(entry => entry.pokemon)
          .filter(p => {
            const id = parseInt(p.url.split('/').filter(Boolean).pop() ?? '0', 10);
            return id >= 1 && id <= maxId;
          });
      }),
      switchMap(filteredPokemons => {
        if (filteredPokemons.length === 0) return of([]);
        const detailRequests = filteredPokemons.map(p => this.getPokemonDetail(p.name));
        return forkJoin(detailRequests);
      }),
      map((details: PokemonDetail[]) => {
        const mappedList = details.map(d => ({
          name: d.name,
          url: `${this.baseUrl}/pokemon/${d.id}/`,
          types: d.types.map(t => t.type.name)
        }));
        this.cache.typePokemon.set(cacheKey, mappedList);
        return mappedList;
      })
    );
  }

  getEvolutionChainByUrl(url: string): Observable<EvolutionChain> {
    const cached = this.cache.evolution.get(url);
    if (cached) return of(cached);

    return this.http.get<EvolutionChain>(url).pipe(
      tap(data => this.cache.evolution.set(url, data))
    );
  }
}