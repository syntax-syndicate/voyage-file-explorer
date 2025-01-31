import {
  Component,
  computed,
  DestroyRef,
  inject,
  resource,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { File, NgxVoyageComponent } from 'ngx-voyage';
import { filter } from 'rxjs';
import { pathToUrl, urlToPath } from './model';

@Component({
  selector: 'app-root',
  imports: [NgxVoyageComponent],
  template: `<div class="h-full w-full"
    ><ngx-voyage
      [path]="path()"
      [files]="files()"
      (openFolder)="openFolder($event)"
      (openFile)="openFile($event)"
    ></ngx-voyage
  ></div>`,
})
export class VoyageComponent {
  #router = inject(Router);
  #destroyRef = inject(DestroyRef);
  path = signal<string[]>([]);

  filesResource = resource({
    request: () => encodeURIComponent('/' + this.path().join('/')),
    loader: async ({ request, abortSignal }) => {
      const response = await fetch(`http://localhost:3003/ls/${request}`, {
        signal: abortSignal,
      });
      return (await response.json()) as File[];
    },
  });

  files = computed<File[]>(() => {
    if (this.filesResource.hasValue()) {
      return this.filesResource.value() ?? [];
    }
    return [];
  });

  constructor() {
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((event) => {
        const p = urlToPath(event.url);
        this.path.set(p);
      });
  }

  openFolder(path: string[]) {
    this.path.set(path);
    const url = pathToUrl(path);
    this.#router.navigateByUrl(url);
  }

  openFile(path: string[]) {
    const url = encodeURIComponent(pathToUrl(path));
    window.open(`http://localhost:3003/open/${url}`, '_blank')?.focus();
  }
}
