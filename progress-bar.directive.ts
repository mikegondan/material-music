import { Directive, HostListener, ElementRef, Input } from '@angular/core';
import { MusicPlayerService } from './music-player.service';

@Directive({
  selector: '[ProgressBar]'
})
export class ProgressBarDirective {
    private event: MouseEvent;
    private clientX = 0;
    private clientY = 0;

    private onEvent(event: MouseEvent): void {
        this.event = event;
    }

    private coordinates(event: MouseEvent):void {
        this.clientX = event.clientX;
        this.clientY = event.clientY;
    }


  constructor( private _musicPlayerService: MusicPlayerService ) {}

  @HostListener('click', ['$event']) onClick($event, element, event: MouseEvent) {
      let getXOffset = function (event) {

          let x = 0,
              element = event.target;
          while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
              x += element.offsetLeft - element.scrollLeft;
              element = element.offsetParent;
          }
          return event.clientX - x;
      };
      let x = $event.offsetX || getXOffset($event),
          width = $event.target.clientWidth,
          duration = this._musicPlayerService.duration;
      let progress = (x / width) * duration;
      this._musicPlayerService.adjustProgress(progress);
  }
}
