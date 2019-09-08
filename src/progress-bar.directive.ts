import { Directive, HostListener } from '@angular/core';
import { MusicPlayerService } from './music-player.service';

@Directive({
  selector: '[ProgressBar]'
})
export class ProgressBarDirective {

  constructor( private _musicPlayerService: MusicPlayerService ) {}

  @HostListener('click', ['$event']) onClick($event) {
      const getXOffset = function (event) {

          let x = 0;
          let element = event.target;
          while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
              x += element.offsetLeft - element.scrollLeft;
              element = element.offsetParent;
          }
          return event.clientX - x;
      };
      const x = $event.offsetX || getXOffset($event);
      const width = $event.target.clientWidth;
      const duration = this._musicPlayerService.duration;
      const progress = (x / width) * duration;
      this._musicPlayerService.adjustProgress(progress);
  }
}
