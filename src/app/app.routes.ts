import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/pokemon', pathMatch: 'full' },
  { path: 'pokemon', loadComponent: () => import('./components/pokemon-list/pokemon-list').then(c => c.PokemonList) },
  { path: 'pokemon/:name', loadComponent: () => import('./components/pokemon-detail/pokemon-detail').then(c => c.PokemonDetail) },
  { path: '**', redirectTo: '/pokemon' }
];
