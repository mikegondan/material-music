import { Directive, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { MusicPlayerService } from './music-player.service';

@Directive({
  selector: '[shuffleMusic]'
})
export class ShuffleMusicDirective implements OnInit, OnDestroy {

  shuffle: boolean;

  // subscriptions
  private _musicPlayerShuffleSubscription: any;

  constructor(private _musicPlayerService: MusicPlayerService,
              private _element: ElementRef) {}

  ngOnInit() {
    this.shuffle = this._musicPlayerService.getRepeatStatus();
    this.highlight();

    // Subscribe for repeat changes to update bindings
    this._musicPlayerShuffleSubscription = this._musicPlayerService.musicPlayerShuffleEventEmitter
      .subscribe((event: any) => {
        this.shuffle = event.data;
        this.highlight();
      });
  }

  ngOnDestroy() {
    this._musicPlayerShuffleSubscription.unsubscribe();
  }

  /**
   * Element click event handler
   */
  @HostListener('click', ['$event']) onClick() {
    this._musicPlayerService.shuffleToggle();
  }

  /**
   * Change background color of element based on repeat state
   */
  private highlight(): void {
      this._element.nativeElement.style.color = this.shuffle ? '#fcc100' : '#dbdbdb';
  }
}
