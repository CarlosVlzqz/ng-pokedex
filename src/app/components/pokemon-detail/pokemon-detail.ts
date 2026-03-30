import { Component, inject, signal, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PokemonService, PokemonDetail as IPokemonDetail, PokemonSpecies } from '../../services/pokemon';
import { getColorSync, getPaletteSync } from 'colorthief';
import { forkJoin } from 'rxjs';

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A890F0', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705848',
  steel: '#B7B7CE', fairy: '#D685AD'
};

const TYPE_IDS: Record<string, number> = {
  normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5, rock: 6, bug: 7, ghost: 8, steel: 9,
  fire: 10, water: 11, grass: 12, electric: 13, psychic: 14, ice: 15, dragon: 16, dark: 17, fairy: 18
};

export interface Matchup {
  name: string;
  multiplier: number;
}

export interface EvolutionLink {
  fromName: string;
  fromImage: string;
  toName: string;
  toImage: string;
  details: string;
}

@Component({
  selector: 'app-pokemon-detail',
  imports: [RouterLink],
  templateUrl: './pokemon-detail.html',
  styleUrl: './pokemon-detail.css'
})
export class PokemonDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private pokemonService = inject(PokemonService);

  pokemon = signal<IPokemonDetail | null>(null);
  description = signal<string>('');
  category = signal<string>('');
  japaneseName = signal<string>('');
  activeTab = signal<'about' | 'stats' | 'matchups' | 'evolutions'>('about');

  weaknesses = signal<Matchup[]>([]);
  resistances = signal<Matchup[]>([]);
  immunities = signal<Matchup[]>([]);

  evolutions = signal<EvolutionLink[]>([]);

  isLoading = signal<boolean>(true);
  isShiny = signal<boolean>(false);
  evolutionsLoading = signal<boolean>(false);

  prevId = signal<number | null>(null);
  nextId = signal<number | null>(null);
  cardBackground = signal<string>('var(--bg-color)');

  @ViewChild('pokemonImage') pokemonImageRef!: ElementRef<HTMLImageElement>;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const name = params.get('name');
      if (name) {
        this.loadPokemon(name);
      }
    });
  }

  loadPokemon(nameOrId: string | number) {
    this.isLoading.set(true);
    this.isShiny.set(false);
    this.activeTab.set('about');

    // Clear previous data
    this.evolutions.set([]);
    this.weaknesses.set([]);
    this.resistances.set([]);
    this.immunities.set([]);
    this.japaneseName.set('');
    this.description.set('');
    this.category.set('');

    this.pokemonService.getPokemonDetail(nameOrId).subscribe({
      next: (data) => {
        this.pokemon.set(data);
        this.isLoading.set(false);

        // Navigation IDs
        const MAX_POKEMON_ID = 493; // Gen I–IV cap; increase to support later gens
        this.prevId.set(data.id > 1 ? data.id - 1 : null);
        this.nextId.set(data.id < MAX_POKEMON_ID ? data.id + 1 : null);

        this.pokemonService.getPokemonSpecies(data.id).subscribe({
          next: (species) => {
            const entry = species.flavor_text_entries.find(e => e.language.name === 'en');
            if (entry) {
              this.description.set(entry.flavor_text.replace(/\f|\n|\r/g, ' '));
            }
            const genusEntry = species.genera.find(g => g.language.name === 'en');
            if (genusEntry) {
              this.category.set(genusEntry.genus);
            }
            const jpName = species.names.find(n => n.language.name === 'ja-Hrkt')
              ?? species.names.find(n => n.language.name === 'ja');
            if (jpName) {
              this.japaneseName.set(jpName.name);
            }
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  switchTab(tab: 'about' | 'stats' | 'matchups' | 'evolutions') {
    this.activeTab.set(tab);

    if (tab === 'matchups' && this.weaknesses().length === 0) {
      this.loadMatchups();
    } else if (tab === 'evolutions' && this.evolutions().length === 0) {
      this.loadEvolutions();
    }
  }

  private loadMatchups() {
    const data = this.pokemon();
    if (!data) return;

    const typeRequests = data.types.map(t => this.pokemonService.getTypeDetails(t.type.name));
    forkJoin(typeRequests).subscribe({
      next: (typeDetailsArray) => {
        const multipliers: Record<string, number> = {};
        Object.keys(TYPE_IDS).forEach(t => multipliers[t] = 1);

        typeDetailsArray.forEach(details => {
          const relations = details.damage_relations;
          relations.double_damage_from.forEach(t => multipliers[t.name] *= 2);
          relations.half_damage_from.forEach(t => multipliers[t.name] *= 0.5);
          relations.no_damage_from.forEach(t => multipliers[t.name] *= 0);
        });

        const weak: Matchup[] = [];
        const resist: Matchup[] = [];
        const immune: Matchup[] = [];

        Object.keys(multipliers).forEach(type => {
          const mult = multipliers[type];
          if (mult > 1) weak.push({ name: type, multiplier: mult });
          else if (mult === 0) immune.push({ name: type, multiplier: mult });
          else if (mult < 1) resist.push({ name: type, multiplier: mult });
        });

        weak.sort((a, b) => b.multiplier - a.multiplier);
        resist.sort((a, b) => a.multiplier - b.multiplier);

        this.weaknesses.set(weak);
        this.resistances.set(resist);
        this.immunities.set(immune);
      }
    });
  }

  private loadEvolutions() {
    const data = this.pokemon();
    if (!data) return;

    this.evolutionsLoading.set(true);
    this.pokemonService.getPokemonSpecies(data.id).subscribe({
      next: (species) => {
        if (species.evolution_chain && species.evolution_chain.url) {
          this.pokemonService.getEvolutionChainByUrl(species.evolution_chain.url).subscribe({
            next: (evoChain) => {
              this.evolutions.set(this.parseEvolutions(evoChain.chain));
              this.evolutionsLoading.set(false);
            },
            error: () => this.evolutionsLoading.set(false)
          });
        } else {
          this.evolutionsLoading.set(false);
        }
      },
      error: () => this.evolutionsLoading.set(false)
    });
  }


  toggleShiny() {
    this.isShiny.update(v => !v);
  }

  playCry(event: Event, url: string) {
    event.stopPropagation();
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(err => console.error('Failed to play cry:', err));
  }

  currentImageUrl() {
    const p = this.pokemon();
    if (!p) return '';
    return this.isShiny()
      ? p.sprites.other['official-artwork'].front_shiny
      : p.sprites.other['official-artwork'].front_default;
  }

  onImageLoad() {
    const p = this.pokemon();
    if (!p) return;

    const imgEl = this.pokemonImageRef?.nativeElement;
    if (imgEl && imgEl.complete) {
      try {
        const color = getColorSync(imgEl);
        let mainColor = 'white';
        if (Array.isArray(color)) {
          mainColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        } else if (color && typeof (color as any).hex === 'function') {
          mainColor = (color as any).hex();
        }

        const typeColors = p.types.map(t => TYPE_COLORS[t.type.name] || '#ccc');

        const randomDegree = Math.floor(Math.random() * 360);
        const allColors = [mainColor, ...typeColors];

        for (let i = allColors.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allColors[i], allColors[j]] = [allColors[j], allColors[i]];
        }

        if (allColors.length === 2) {
          this.cardBackground.set(`linear-gradient(${randomDegree}deg, ${allColors[0]} 0%, ${allColors[1]} 100%)`);
        } else if (allColors.length === 3) {
          this.cardBackground.set(`linear-gradient(${randomDegree}deg, ${allColors[0]} 0%, ${allColors[1]} 50%, ${allColors[2]} 100%)`);
        } else {
          this.cardBackground.set(allColors[0]);
        }
      } catch (err) {
        console.error('Failed to extract color:', err);
      }
    }
  }

  getTypeColor(name: string): string {
    return TYPE_COLORS[name.toLowerCase()] || '#777';
  }

  getPokemonImageFromUrl(url: string): string {
    const id = url.split('/').filter(Boolean).pop();
    if (!id) return '';
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }



  getEvolutionDetailsString(detailsResponse: any[]): string {
    if (!detailsResponse || detailsResponse.length === 0) return 'Unknown';
    const details = detailsResponse[0];
    if (!details || !details.trigger) return 'Unknown';

    if (details.trigger.name === 'level-up') {
      if (details.min_level) return `Lvl ${details.min_level}`;
      if (details.min_happiness) return `High Friendship`;
      return `Level Up`;
    }
    if (details.trigger.name === 'trade') {
      if (details.held_item) return `Trade w/ ${details.held_item.name.replace(/-/g, ' ')}`;
      return `Trade`;
    }
    if (details.trigger.name === 'use-item' && details.item) {
      return `${details.item.name.replace(/-/g, ' ')}`;
    }
    return details.trigger.name.replace(/-/g, ' ');
  }

  parseEvolutions(node: any): EvolutionLink[] {
    const links: EvolutionLink[] = [];

    const traverse = (currentNode: any) => {
      if (!currentNode.evolves_to || currentNode.evolves_to.length === 0) return;

      const fromName = currentNode.species.name;
      const fromImage = this.getPokemonImageFromUrl(currentNode.species.url);

      currentNode.evolves_to.forEach((nextNode: any) => {
        const toName = nextNode.species.name;
        const toImage = this.getPokemonImageFromUrl(nextNode.species.url);
        const details = this.getEvolutionDetailsString(nextNode.evolution_details);

        links.push({
          fromName,
          fromImage,
          toName,
          toImage,
          details
        });

        traverse(nextNode);
      });
    };

    traverse(node);
    return links;
  }

  readonly MAX_STAT = 255;

  getStatPercentage(baseStat: number): number {
    return (baseStat / this.MAX_STAT) * 100;
  }

  getStatColor(baseStat: number): string {
    if (baseStat < 50) return '#ff4e4e';      // Red (Low)
    if (baseStat < 80) return '#f5ac78';      // Orange (Below Average)
    if (baseStat < 100) return '#fae078';     // Yellow (Average)
    if (baseStat < 120) return '#a7db8d';     // Light Green (Good)
    if (baseStat < 150) return '#78c850';     // Green (Great)
    return '#39cfc1';                         // Cyan/Teal (Outstanding)
  }

  formatStatName(statName: string): string {
    const statMap: Record<string, string> = {
      'hp': 'HP',
      'attack': 'Attack',
      'defense': 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      'speed': 'Speed'
    };
    return statMap[statName] || statName;
  }

}
