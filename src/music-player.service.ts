import {Injectable, EventEmitter} from '@angular/core';
import {MusicPlayerEventConstants} from './music-player-events.constants';
import {ITrackEvent} from './itrack-event.interface';
import {MusicPlayerUtils} from './music-player.utils';

declare const soundManager: any;

@Injectable()
export class MusicPlayerService {

    public currentTrack: string = null;

    public repeat = false;
    public shuffle = false;
    public autoPlay = true;
    public isPlaying = false;

    public trackProgress = 0;
    public volume = 100;
    public position: number;
    public duration: number;

    public playlist: Array<any> = [];

    public musicPlayerEventEmitter: EventEmitter<any> = new EventEmitter();
    public musicPlayerMuteEventEmitter: EventEmitter<any> = new EventEmitter();
    public musicPlayerRepeatEventEmitter: EventEmitter<any> = new EventEmitter();
    public musicPlayerShuffleEventEmitter: EventEmitter<any> = new EventEmitter();
    public musicPlayerStopEventEmitter: EventEmitter<any> = new EventEmitter();
    public musicPlayerTrackEventEmitter: EventEmitter<any> = new EventEmitter();
    public musicPlayerVolumeEventEmitter: EventEmitter<any> = new EventEmitter();

    private _soundObject: any;

    constructor() {
        this.init();
    }

    /**
     * Initialize soundmanager,
     * requires soundmanager2 to be loaded first
     */
    init(): void {
        if (typeof soundManager === 'undefined') {
            alert('Please include SoundManager2 Library!');
        }
        this._soundObject = soundManager.setup({
            preferFlash: false, // prefer 100% HTML5 mode, where both supported
            debugMode: false,   // enable debugging output
            useHTML5Audio: true, // http://www.schillmania.com/projects/soundmanager2/doc/#soundmanager-usehtml5audio
            /**
             * @reference http://www.schillmania.com/projects/soundmanager2/doc/#sm-config
             * @description onready Events (Callbacks)
             * Queues an event callback/handler for successful initialization and "ready to use" state of SoundManager 2.
             * An optional scope parameter can be specified; if none, the callback is scoped to the window.
             * If onready() is called after successful initialization, the callback will be executed immediately.
             * The onready() queue is processed before soundManager.onload().
             */
            onready: () => {
                // Assign instance of this Angular MusicPlayerService to soundManager object
                // so that the SMSound Objects can access it
                soundManager.parent = this;

                // Ready to use; soundManager.createSound() etc. can now be called.
                // Emit event
                const isSupported = soundManager.ok();
                this.musicPlayerEventEmitter.emit({
                    event: MusicPlayerEventConstants.ANGULAR_PLAYER_READY,
                    data: isSupported
                });
            },
            /**
             * @reference http://www.schillmania.com/projects/soundmanager2/doc/#sm-config
             * @description ontimeout Events (Callbacks)
             * Queues an event callback/handler for SM2 init failure, processed at (or immediately,
             * if added after) SM2 initialization has failed, just before soundManager.onerror() is called.
             * An optional scope parameter can be specified; if none, the callback is scoped to the window.
             * Additionally, a status object containing success and error->type parameters is passed as an argument to your callback.
             */
            ontimeout: () => {
                alert('SM2 failed to start. Flash missing, blocked or security error?');
                alert('The status is ' + this._soundObject.status.success + ', the error type is ' + this._soundObject.status.error.type);
            },
            defaultOptions: {
                // set global default volume for all sound objects
                autoLoad: false, // enable automatic loading (otherwise .load() will call with .play())
                autoPlay: false, // enable playing of file ASAP (much faster if "stream" is true)
                from: null, // position to start playback within a sound (msec), see demo
                loops: 1, // number of times to play the sound. Related: looping (API demo)
                multiShot: false, // let sounds "restart" or "chorus" when played multiple times..
                multiShotEvents: false, // allow events (onfinish()) to fire for each shot, if supported.
                onid3: null, // callback function for "ID3 data is added/available"
                onload: null, // callback function for "load finished"
                onstop: null, // callback for "user stop"
                onfailure: 'nextTrack', // callback function for when playing fails
                onpause: null, // callback for "pause"
                onplay: null, // callback for "play" start
                onresume: null, // callback for "resume" (pause toggle)
                position: null, // offset (milliseconds) to seek to within downloaded sound.
                pan: 0, // "pan" settings, left-to-right, -100 to 100
                stream: true, // allows playing before entire file has loaded (recommended)
                to: null, // position to end playback within a sound (msec), see demo
                type: 'audio/mp3', // MIME-like hint for canPlay() tests, eg. 'audio/mp3'
                usePolicyFile: false, // enable crossdomain.xml request for remote domains (for ID3/waveform access)
                volume: this.volume, // self-explanatory. 0-100, the latter being the max.
                /**
                 * SMSound (sound instance) object instance event handler
                 * @note Event handlers are scoped to the relevant sound object,
                 * so the this keyword will point to the sound object on which
                 * the event fired such that its properties can easily be accessed
                 */
                whileloading: function () {
                    soundManager._writeDebug('sound ' + this.id + ' loading, ' + this.bytesLoaded + ' of ' + this.bytesTotal);
                    const trackLoaded = ((this.bytesLoaded / this.bytesTotal) * 100);
                    const musicPlayerService = soundManager.parent;
                    if (musicPlayerService) {
                        musicPlayerService.musicPlayerEventEmitter.emit({
                            event: MusicPlayerEventConstants.TRACK_LOADED,
                            data: trackLoaded
                        });
                    }
                },
                /**
                 * SMSound (sound instance) object instance event handler
                 * @note Event handlers are scoped to the relevant sound object,
                 * so the this keyword will point to the sound object on which
                 * the event fired such that its properties can easily be accessed
                 */
                whileplaying: function () {
                    soundManager._writeDebug('sound ' + this.id + ' playing, ' + this.position + ' of ' + this.duration);
                    const musicPlayerService = soundManager.parent;

                    if (musicPlayerService) {
                        // broadcast current playing track id
                        musicPlayerService.currentTrack = this.id;
                        try {
                            musicPlayerService.trackProgress = ((this.position / this.duration) * 100);
                            musicPlayerService.trackLoaded = ((this.bytesLoaded / this.bytesTotal) * 100);
                            musicPlayerService.bytesLoaded = this.bytesLoaded;
                            musicPlayerService.bytesTotal = this.bytesTotal;
                            musicPlayerService.position = this.position;
                            musicPlayerService.duration = this.duration;
                        } catch (error) {
                            musicPlayerService.trackProgress = 0;
                            musicPlayerService.trackLoaded = 0;
                            musicPlayerService.bytesLoaded = 0;
                            musicPlayerService.bytesTotal = 0;
                            musicPlayerService.position = 0;
                            musicPlayerService.duration = 0;
                        }

                        const trackEventData = {
                            trackId: musicPlayerService.currentTrack,
                            trackProgress: musicPlayerService.trackProgress,
                            trackLoaded: musicPlayerService.trackLoaded,
                            bytesLoaded: this.bytesLoaded,
                            bytesTotal: this.bytesTotal,
                            trackPosition: this.position,
                            trackDuration: this.duration
                        };
                        musicPlayerService.musicPlayerTrackEventEmitter.emit({
                            event: MusicPlayerEventConstants.TRACK_ID,
                            data: trackEventData
                        });
                    }
                },
                /**
                 * SMSound (sound instance) object instance event handler
                 * @note Using ES6 and this refers to the Angular MusicPlayerService instances
                 * instead of the SMSound object instance
                 */
                onfinish: () => {
                    if (this.autoPlay === true) {
                        this.nextTrack();

                        const trackEventData: ITrackEvent = {
                            trackId: this.currentTrack,
                            trackProgress: this.trackProgress,
                            trackPosition: this.position,
                            trackDuration: this.duration
                        };
                        this.musicPlayerTrackEventEmitter.emit({
                            event: MusicPlayerEventConstants.TRACK_ID,
                            data: trackEventData
                        });
                    }
                }
            }
        });
    }

    /**
     *
     * @param key
     */
    setCurrentTrack(key: string): void {
        this.currentTrack = key;
    }

    /**
     *
     * @returns {any}
     */
    getCurrentTrack() {
        return this.currentTrack;
    }

    /**
     *
     * @returns {any}
     */
    currentTrackData() {
        const trackId = this.getCurrentTrack();
        const currentKey = MusicPlayerUtils.IsInArray(this.playlist, trackId);
        return this.playlist[currentKey];
    }

    /**
     *
     * @param key
     * @returns {Array<any>}
     */
    getPlaylist(key?: number): Array<any> {
        if (typeof key === 'undefined') {
            return this.playlist;
        } else {
            return this.playlist[key];
        }
    }

    /**
     *
     * @param track
     */
    addToPlaylist(track: any): void {
        this.playlist.push(track);
        // broadcast playlist
        this.musicPlayerEventEmitter.emit({
            event: MusicPlayerEventConstants.PLAYER_PLAYLIST,
            data: this.playlist
        });
    }

    /**
     *
     * @param track
     * @returns {number}
     */
    addTrack(track: any): number {
        // check if track itself is valid and if its url is playable
        if (!MusicPlayerUtils.IsTrackValid) {
            return null;
        }

        // check if song already does not exists then add to playlist
        const inArrayKey: number = MusicPlayerUtils.IsInArray(this.getPlaylist(undefined), track.id);
        if (inArrayKey < 0) {
            // console.warn('song does not exists in playlist:', track);
            // add to sound manager
            soundManager.createSound({
                id: track.id,
                url: track.url
            });
            // add to playlist
            this.addToPlaylist(track);
        }
        return track.id;
    }

    /**
     *
     * @param song
     * @param {number} index
     */
    removeSong(song: any, index: number): void {
        // if this song is playing stop it
        if (song === this.currentTrack) {
            this.stop();
        }
        // unload from soundManager
        soundManager.destroySound(song);

        // remove from playlist
        this.playlist.splice(index, 1);

        // once all done then broadcast
        this.musicPlayerEventEmitter.emit({
            event: MusicPlayerEventConstants.PLAYER_PLAYLIST,
            data: this.playlist
        });
    }

    /**
     *
     * @param trackId
     * @param isResume
     */
    initPlayTrack(trackId: string, isResume: boolean): void {
        if (isResume !== true) {
            // stop and unload currently playing track
            this.stop();
            // set new track as current track
            this.setCurrentTrack(trackId);
        }
        // play it
        soundManager.play(trackId);
        const trackEventData: ITrackEvent = {
            trackId: this.currentTrack,
            trackProgress: this.trackProgress,
            trackDuration: this.duration,
            trackPosition: 0
        };
        this.musicPlayerTrackEventEmitter.emit({
            event: MusicPlayerEventConstants.TRACK_ID,
            data: trackEventData
        });

        // set as playing
        this.isPlaying = true;
        this.musicPlayerEventEmitter.emit({
            event: MusicPlayerEventConstants.MUSIC_IS_PLAYING,
            data: this.isPlaying
        });
    }

    /**
     * Plays currently selected track
     * If the track is already playing, ignore event
     */
    play(): void {
        if (!this.isPlaying) {
            let trackToPlay = null;
            // check if no track loaded, else play loaded track
            if (this.getCurrentTrack() === null) {
                if (soundManager.soundIDs.length === 0) {
                    return;
                }
                trackToPlay = soundManager.soundIDs[0];
                this.initPlayTrack(trackToPlay, false);
            } else {
                trackToPlay = this.getCurrentTrack();
                this.initPlayTrack(trackToPlay, true);
            }
        }
    }

    /**
     * Toggles Pause state
     */
    pause(): void {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            soundManager.play(this.currentTrack);
        } else {
            soundManager.pause(this.getCurrentTrack());
        }

        this.musicPlayerEventEmitter.emit({
            event: MusicPlayerEventConstants.MUSIC_IS_PLAYING,
            data: this.isPlaying
        });
    }

    /**
     * Stops audio playback and clears playback status
     */
    stop(): void {
        // first pause it
        soundManager.pause(this.getCurrentTrack());
        this.isPlaying = false;
        this.resetProgress();
        const trackEventData: ITrackEvent = {
            trackId: this.currentTrack,
            trackProgress: this.trackProgress,
            trackDuration: 0,
            trackPosition: 0
        };
        this.musicPlayerStopEventEmitter.emit({
            event: MusicPlayerEventConstants.TRACK_STOP,
            data: trackEventData
        });

        soundManager.stopAll();
        soundManager.unload(this.getCurrentTrack());
    }

    /**
     * Plays selected track
     * @param trackId
     */
    playTrack(trackId: string): void {
        this.initPlayTrack(trackId, false);
    }

    /**
     *
     */
    nextTrack(): void {
        if (this.getCurrentTrack() === null) {
            console.log('Please click on Play before this action');
            return null;
        }

        const currentTrackKey = MusicPlayerUtils.GetIndexByValue(soundManager.soundIDs, this.getCurrentTrack());
        const nextTrackKey = +currentTrackKey + 1;
        let nextTrack;

        if (this.shuffle === true) {
            // select random track from playlist if shuffle is on
            let randomTrack = soundManager.soundIDs[Math.floor(Math.random() * soundManager.soundIDs.length)];
            let randomTrackKey = MusicPlayerUtils.GetIndexByValue(soundManager.soundIDs, randomTrack);

            if (randomTrackKey !== currentTrackKey) {
                nextTrack = soundManager.soundIDs[randomTrackKey];
                if (typeof nextTrack === 'undefined') {
                    randomTrack = soundManager.soundIDs[Math.floor(Math.random() * soundManager.soundIDs.length)];
                    randomTrackKey = MusicPlayerUtils.GetIndexByValue(soundManager.soundIDs, randomTrack);
                    nextTrack = soundManager.soundIDs[randomTrackKey];
                }
            }
        } else {
            nextTrack = soundManager.soundIDs[nextTrackKey];
        }

        if (typeof nextTrack !== 'undefined') {
            this.playTrack(nextTrack);
        } else {
            // if no next track found
            if (this.repeat === true) {
                // start first track if repeat is on
                this.playTrack(soundManager.soundIDs[0]);
            } else {
                // breadcase not playing anything
                this.isPlaying = false;
                this.musicPlayerEventEmitter.emit({
                    event: MusicPlayerEventConstants.MUSIC_IS_PLAYING,
                    data: this.isPlaying
                });
            }
        }
    }

    /**
     *
     */
    prevTrack(): void {
        if (this.getCurrentTrack() === null) {
            console.log('Please click on Play before this action');
            return null;
        }

        const currentTrackKey = MusicPlayerUtils.GetIndexByValue(soundManager.soundIDs, this.getCurrentTrack());
        const prevTrackKey = +currentTrackKey - 1;
        const prevTrack = soundManager.soundIDs[prevTrackKey];

        if (typeof prevTrack !== 'undefined') {
            this.playTrack(prevTrack);
        } else {
            console.warn('no prev track found!');
        }
    }

    /**
     *  Mute/Unmute audio
     */
    mute(): void {
        if (soundManager.muted === true) {
            soundManager.unmute();
        } else {
            soundManager.mute();
        }

        this.musicPlayerMuteEventEmitter.emit({
            event: MusicPlayerEventConstants.MUSIC_MUTE,
            data: soundManager.muted
        });
    }

    /**
     * Mute Accessor
     * @returns {boolean}
     */
    getMuteStatus() {
        return soundManager.muted;
    }

    /**
     *
     */
    repeatToggle(): boolean {
        if (this.repeat === true) {
            this.repeat = false;
        } else {
            this.repeat = true;
        }

        this.musicPlayerRepeatEventEmitter.emit({
            event: MusicPlayerEventConstants.MUSIC_REPEAT,
            data: this.repeat
        });

        return false;
    }

    /**
     *
     * @returns {any}
     */
    getRepeatStatus(): boolean {
        return this.repeat;
    }

    /**
     *
     */
    shuffleToggle(): boolean {
        if (this.shuffle === true) {
            this.shuffle = false;
        } else {
            this.shuffle = true;
        }

        this.musicPlayerShuffleEventEmitter.emit({
            event: MusicPlayerEventConstants.MUSIC_SHUFFLE,
            data: this.shuffle
        });

        return false;
    }

    /**
     *
     * @returns {any}
     */
    getShuffleStatus(): boolean {
        return this.shuffle;
    }

    /**
     *
     * @returns {any}
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     *
     * @param increase
     */
    adjustVolume(increase: boolean) {
        const changeVolume = (volume: number) => {
            for (let i = 0; i < soundManager.soundIDs.length; i++) {
                const mySound = soundManager.getSoundById(soundManager.soundIDs[i]);
                mySound.setVolume(volume);
            }

            this.musicPlayerVolumeEventEmitter.emit({
                event: MusicPlayerEventConstants.MUSIC_VOLUME,
                data: volume
            });
        };
        if (increase === true) {
            if (this.volume < 100) {
                this.volume = this.volume + 10;
                changeVolume(this.volume);
            }
        } else {
            if (this.volume > 0) {
                this.volume = this.volume - 10;
                changeVolume(this.volume);
            }
        }
    }

    /**
     *
     * @param value
     */
    adjustVolumeSlider(value: number) {
        const changeVolume = (volume: number) => {
            for (let i = 0; i < soundManager.soundIDs.length; i++) {
                const mySound = soundManager.getSoundById(soundManager.soundIDs[i]);
                mySound.setVolume(volume);
            }

            this.musicPlayerVolumeEventEmitter.emit({
                event: MusicPlayerEventConstants.MUSIC_VOLUME,
                data: volume
            });
        };
        changeVolume(value);
    }

    /**
     *
     * @param value
     */
    adjustProgress(value: number) {
        let newprogress: number;
        const changeProgress = (progress: number) => {
            for (let i = 0; i < soundManager.soundIDs.length; i++) {
                const mySound = soundManager.getSoundById(soundManager.soundIDs[i]);
                newprogress = progress;
                mySound.setPosition(progress);
            }
            const trackEventData: ITrackEvent = {
                trackId: this.currentTrack,
                trackProgress: ((this.position / this.duration) * 100),
                trackPosition: this.position,
                trackDuration: this.duration
            };
            this.musicPlayerTrackEventEmitter.emit({
                event: MusicPlayerEventConstants.TRACK_ID,
                data: trackEventData
            });
        };
        changeProgress(value);
    }

    /**
     *
     * @param callback
     */
    clearPlaylist(callback?: any) {
        this.isPlaying = false;
        this.currentTrack = null;
        this.resetProgress();

        // unload and destroy soundmanager sounds
        const smIdsLength = soundManager.soundIDs.length;
        MusicPlayerUtils.AsyncLoop({
            length: smIdsLength,
            functionToLoop: (loop: any/*, i: number*/) => {
                setTimeout(() => {
                    // custom code
                    soundManager.destroySound(soundManager.soundIDs[0]);
                    // custom code
                    loop();
                }, 0);
            },
            callback: () => {
                // callback custom code
                // clear playlist
                this.playlist = [];
                this.musicPlayerEventEmitter.emit({
                    event: MusicPlayerEventConstants.PLAYER_PLAYLIST,
                    data: this.playlist
                });
                if (callback) {
                    // callback custom code
                    callback(true);
                }
            }
        });
    }

    /**
     *
     */
    resetProgress() {
        this.trackProgress = 0;
    }

    /**
     *
     * @returns {any}
     */
    isPlayingStatus() {
        return this.isPlaying;
    }
}
