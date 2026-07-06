import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoService, UploadProgress } from '../../core/services/photo.service';

interface PhotoState {
  url: string;       // URL absolue pour affichage
  relative: string;  // URL relative en DB
  filename: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .upload-zone {
      border: 2px dashed #E0EDE8; border-radius: .875rem;
      padding: 2rem; text-align: center; cursor: pointer;
      transition: all .2s; background: #FAFBFA;
    }
    .upload-zone:hover, .upload-zone.drag-over {
      border-color: #2C7A5E; background: #F0F9F5;
    }
    .upload-zone input[type=file] { display: none; }
    .photo-thumb {
      position: relative; border-radius: .75rem; overflow: hidden;
      aspect-ratio: 16/9; background: #E0EDE8;
      border: 2px solid transparent; transition: all .15s; cursor: grab;
    }
    .photo-thumb.first-photo { border-color: #2C7A5E; }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .photo-thumb .overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center; gap: .5rem;
      opacity: 0; transition: opacity .15s;
    }
    .photo-thumb:hover .overlay { opacity: 1; }
    .progress-bar {
      position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #E0EDE8;
    }
    .progress-fill { height: 100%; background: #2C7A5E; transition: width .1s; }
  `],
  template: `
    <div>
      <!-- Photos existantes -->
      @if (photos().length) {
        <div class="grid grid-cols-3 gap-3 mb-3">
          @for (p of photos(); track p.filename; let i = $index) {
            <div class="photo-thumb" [class.first-photo]="i === 0"
                 [attr.title]="i === 0 ? 'Photo principale' : ''">

              @if (p.uploading) {
                <!-- En cours d'upload -->
                <div class="w-full h-full flex flex-col items-center justify-content-center p-2"
                     style="background:#E0EDE8">
                  <div class="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-1"
                       style="border-color:#2C7A5E;border-top-color:transparent"></div>
                  <span style="font-size:.625rem;color:#2C7A5E;font-family:Inter,sans-serif">{{ p.progress ?? 0 }}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" [style.width]="(p.progress ?? 0) + '%'"></div></div>
              } @else if (p.error) {
                <div class="w-full h-full flex items-center justify-center p-2"
                     style="background:#FEF2F2">
                  <p style="font-size:.625rem;color:#DC2626;text-align:center;font-family:Inter,sans-serif">{{ p.error }}</p>
                </div>
              } @else {
                <img [src]="p.url" [alt]="'Photo ' + (i + 1)" loading="lazy"/>
                <div class="overlay">
                  @if (i > 0) {
                    <!-- Mettre en photo principale -->
                    <button type="button" (click)="setFirst(i)"
                            class="w-7 h-7 rounded-full bg-white flex items-center justify-content-center"
                            title="Mettre en avant">
                      <svg class="w-3.5 h-3.5" style="color:#2C7A5E" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                      </svg>
                    </button>
                  }
                  <!-- Supprimer -->
                  <button type="button" (click)="removePhoto(i)"
                          class="w-7 h-7 rounded-full bg-white flex items-center justify-content-center"
                          title="Supprimer">
                    <svg class="w-3.5 h-3.5" style="color:#EF4444" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                    </svg>
                  </button>
                </div>
              }

              <!-- Badge photo principale -->
              @if (i === 0 && !p.uploading && !p.error) {
                <div class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
                     style="background:#2C7A5E;color:white;font-family:Inter,sans-serif">
                  Principale
                </div>
              }
            </div>
          }

          <!-- Ajouter d'autres photos -->
          @if (photos().length < maxPhotos && campaignId) {
            <div class="upload-zone flex flex-col items-center justify-center"
                 style="aspect-ratio:16/9;padding:.75rem"
                 [class.drag-over]="isDragging()"
                 (click)="triggerFileInput()"
                 (dragover)="$event.preventDefault(); isDragging.set(true)"
                 (dragleave)="isDragging.set(false)"
                 (drop)="onDrop($event)">
              <input #extraFileInput type="file" accept="image/jpeg,image/png,image/webp"
                     multiple (change)="onFileSelected($event)"/>
              <svg class="w-5 h-5 mb-1" style="color:#2C7A5E" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
              </svg>
              <p style="font-size:.6875rem;color:#2C7A5E;font-family:Inter,sans-serif">Ajouter</p>
            </div>
          }
        </div>
      }

      <!-- Zone de drop principale (si aucune photo) -->
      @if (!photos().length || !campaignId) {
        <div class="upload-zone"
             [class.drag-over]="isDragging()"
             (click)="triggerFileInput()"
             (dragover)="$event.preventDefault(); isDragging.set(true)"
             (dragleave)="isDragging.set(false)"
             (drop)="onDrop($event)">
          <input #mainFileInput type="file" accept="image/jpeg,image/png,image/webp"
                 multiple (change)="onFileSelected($event)"/>

          <svg class="w-10 h-10 mx-auto mb-2" style="color:#C8DDD7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
          </svg>
          <p style="font-size:.875rem;font-weight:600;color:#0A1F1A;font-family:Inter,sans-serif;margin-bottom:.25rem">
            Glissez-déposez vos photos ici
          </p>
          <p style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
            ou <span style="color:#2C7A5E;font-weight:600">cliquez pour parcourir</span>
          </p>
          <p style="font-size:.6875rem;color:#D1D5DB;margin-top:.5rem;font-family:Inter,sans-serif">
            JPG, PNG, WebP — Max 5 Mo / photo — {{ maxPhotos }} photos max
          </p>
        </div>
      }

      @if (!campaignId) {
        <p class="mt-2" style="font-size:.75rem;color:#9CA3AF;font-family:Inter,sans-serif">
          Les photos seront uploadées après la création de la campagne.
        </p>
      }

      <!-- Erreur globale -->
      @if (globalError()) {
        <p class="mt-2 text-sm" style="color:#DC2626;font-family:Inter,sans-serif">{{ globalError() }}</p>
      }
    </div>
  `,
})
export class PhotoGalleryComponent {
  @Input() campaignId: string | null = null;
  @Input() set initialPhotos(urls: string[]) {
    this.photos.set((urls ?? []).map(url => ({
      url: PhotoService.resolveUrl(url),
      relative: url,
      filename: PhotoService.filenameFromUrl(url),
    })));
  }
  @Input() maxPhotos = 10;

  /** Quand les photos changent (liste des URLs relatives) */
  @Output() photosChange = new EventEmitter<string[]>();

  @ViewChild('mainFileInput') mainFileInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('extraFileInput') extraFileInputRef?: ElementRef<HTMLInputElement>;

  photos     = signal<PhotoState[]>([]);
  isDragging = signal(false);
  globalError = signal('');

  constructor(private photoSvc: PhotoService) {}

  triggerFileInput(): void {
    // Utiliser le ViewChild approprié selon qu'on a des photos ou non
    const ref = this.photos().length ? this.extraFileInputRef : this.mainFileInputRef;
    ref?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) this.uploadFiles(Array.from(files));
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files) this.uploadFiles(Array.from(files));
  }

  uploadFiles(files: File[]): void {
    this.globalError.set('');
    const remaining = this.maxPhotos - this.photos().filter(p => !p.error).length;
    const toUpload  = files.slice(0, remaining);

    if (files.length > remaining) {
      this.globalError.set(`Seulement ${remaining} photo(s) ajoutée(s) (limite de ${this.maxPhotos} atteinte).`);
    }

    for (const file of toUpload) {
      const validation = PhotoService.validate(file);
      if (validation) {
        this.globalError.set(validation);
        continue;
      }

      if (!this.campaignId) {
        // Pas encore de campagne → preview local seulement
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          this.photos.update(ps => [...ps, {
            url, relative: '', filename: file.name,
          }]);
          this.emitChange();
        };
        reader.readAsDataURL(file);
        continue;
      }

      // Upload réel
      const tempId = crypto.randomUUID();
      this.photos.update(ps => [...ps, {
        url: '', relative: '', filename: tempId,
        uploading: true, progress: 0,
      }]);

      this.photoSvc.upload(this.campaignId, file).subscribe({
        next: (progress) => {
          this.photos.update(ps => ps.map(p =>
            p.filename === tempId
              ? { ...p, progress: progress.percent, uploading: !progress.done,
                  ...(progress.done && progress.result ? {
                    url:      PhotoService.resolveUrl(progress.result.relative),
                    relative: progress.result.relative,
                    filename: progress.result.filename,
                  } : {})
                }
              : p
          ));
          if (progress.done) this.emitChange();
        },
        error: (err) => {
          const msg = err?.error?.error || 'Erreur lors de l\'upload.';
          this.photos.update(ps => ps.map(p =>
            p.filename === tempId ? { ...p, uploading: false, error: msg } : p
          ));
        },
      });
    }
  }

  removePhoto(index: number): void {
    const photo = this.photos()[index];
    if (!photo) return;

    if (photo.uploading) return; // Ne pas supprimer pendant l'upload

    if (photo.filename && this.campaignId && !photo.url.startsWith('data:')) {
      this.photoSvc.delete(this.campaignId, photo.filename).subscribe({
        error: () => {}, // Continuer même si la suppression serveur échoue
      });
    }

    this.photos.update(ps => ps.filter((_, i) => i !== index));
    this.emitChange();
  }

  setFirst(index: number): void {
    const ps = [...this.photos()];
    const [item] = ps.splice(index, 1);
    ps.unshift(item);
    this.photos.set(ps);

    if (this.campaignId) {
      const order = ps.map(p => p.relative).filter(Boolean);
      this.photoSvc.reorder(this.campaignId, order).subscribe();
    }
    this.emitChange();
  }

  private emitChange(): void {
    const urls = this.photos()
      .filter(p => p.relative && !p.uploading && !p.error)
      .map(p => p.relative);
    this.photosChange.emit(urls);
  }
}
