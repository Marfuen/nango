import type { MaybePromise } from '@nangohq/types';
import type { ConnectUIEvent, ConnectUIEventToken } from './types';

export interface ConnectUIProps {
    sessionToken?: string;
    baseURL?: string;
    onEvent?: (event: ConnectUIEvent) => MaybePromise<void>;
}

export class ConnectUI {
    iframe: HTMLIFrameElement | null = null;

    private isReady = false;
    private listener: ((this: Window, ev: MessageEvent) => any) | null = null;
    private sessionToken;
    private baseURL;
    private onEvent;

    constructor({ sessionToken, baseURL = 'https://connect.nango.dev', onEvent }: ConnectUIProps) {
        this.sessionToken = sessionToken;
        this.baseURL = baseURL;
        this.onEvent = onEvent;
    }

    /**
     * Open UI in an iframe and listen to events
     */
    open() {
        console.log('Opening connect ui');

        // Create an iframe that will contain the ConnectUI on top of existing UI
        const iframe = document.createElement('iframe');
        iframe.src = new URL(this.baseURL).href;
        iframe.id = 'connect-ui';
        iframe.style.position = 'fixed';
        iframe.style.zIndex = '9999';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.backgroundColor = 'transparent';

        this.iframe = iframe;
        document.body.append(iframe);

        document.body.style.overflow = 'hidden';

        // Listen to event sent from ConnectUI
        this.listener = (event) => {
            if (event.origin !== this.baseURL) {
                return;
            }

            if (typeof event.data !== 'object' || !event.data || !event.data.type) {
                return;
            }

            const evt = event.data as ConnectUIEvent;

            switch (evt.type) {
                case 'ready': {
                    this.isReady = true;
                    this.sendSessionToken();

                    break;
                }
                case 'close': {
                    this.close();
                    break;
                }
                default: {
                    break;
                }
            }

            // Transfer event to customers' frontend
            if (this.onEvent) {
                void this.onEvent(evt);
            }
        };
        window.addEventListener('message', this.listener, false);
    }

    /**
     * Set the session token and send it to the Connect UI iframe
     */
    setSessionToken(sessionToken: string) {
        this.sessionToken = sessionToken;
        if (this.isReady) {
            this.sendSessionToken();
        }
    }

    /**
     * Close UI and clear state
     */
    close() {
        if (this.listener) {
            window.removeEventListener('message', this.listener);
        }
        if (this.iframe) {
            document.body.removeChild(this.iframe);
            this.iframe = null;
        }
    }

    private sendSessionToken() {
        if (!this.sessionToken) {
            return;
        }

        const data: ConnectUIEventToken = { type: 'session_token', sessionToken: this.sessionToken };
        this.iframe?.contentWindow?.postMessage(data, '*');
    }
}
