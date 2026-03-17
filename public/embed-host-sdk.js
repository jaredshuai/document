(function initDocumentEditorHostBridge(global) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  /**
   * Encode a bridge payload into the base64 transport format expected by the editor.
   */
  function encodeMessage(data) {
    return btoa(String.fromCharCode(...encoder.encode(JSON.stringify(data))));
  }

  /**
   * Decode a bridge payload received from the embedded editor.
   */
  function decodeMessage(encoded) {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(decoder.decode(bytes));
  }

  /**
   * Host-side helper for controlling the embedded document editor through postMessage.
   */
  class DocumentEditorHostBridge {
    constructor({ iframe, targetOrigin = global.location.origin, timeoutMs = 15000 }) {
      this.iframe = iframe;
      this.targetOrigin = targetOrigin;
      this.timeoutMs = timeoutMs;
      this.pendingResponses = new Map();
      this.hostEventListeners = new Set();
      this.handleMessage = this.handleMessage.bind(this);

      global.addEventListener('message', this.handleMessage);
    }

    /**
     * Return the current iframe content window.
     */
    getEditorWindow() {
      return this.iframe?.contentWindow ?? null;
    }

    /**
     * Listen for asynchronous host callback events emitted by the editor.
     */
    onHostEvent(listener) {
      this.hostEventListeners.add(listener);
      return () => {
        this.hostEventListeners.delete(listener);
      };
    }

    /**
     * Send a command to the editor and wait for the immediate bridge response.
     */
    postCommand(type, payload = {}) {
      const editorWindow = this.getEditorWindow();
      if (!editorWindow) {
        return Promise.reject(new Error('Editor iframe is not available.'));
      }

      const id = `host-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const message = encodeMessage({ id, type, payload });

      return new Promise((resolve, reject) => {
        const timeoutId = global.setTimeout(() => {
          this.pendingResponses.delete(id);
          reject(new Error(`Timed out waiting for ${type} response.`));
        }, this.timeoutMs);

        this.pendingResponses.set(id, {
          resolve,
          reject,
          timeoutId,
        });

        editorWindow.postMessage(message, this.targetOrigin);
      });
    }

    /**
     * Wait until the editor bridge responds to lightweight PING probes.
     */
    async waitForBridge(timeoutMs = this.timeoutMs) {
      const startedAt = Date.now();

      while (Date.now() - startedAt < timeoutMs) {
        try {
          await this.postCommand('PING');
          return;
        } catch {
          await new Promise((resolve) => global.setTimeout(resolve, 150));
        }
      }

      throw new Error('Editor bridge did not become ready in time.');
    }

    /**
     * Ask the editor to create a new document with the given extension.
     */
    async createNew(ext) {
      await this.waitForBridge();
      return this.postCommand('CREATE_NEW', { ext });
    }

    /**
     * Ask the editor to open a remote document URL.
     */
    async openDocumentUrl(url, fileName) {
      await this.waitForBridge();
      return this.postCommand('OPEN_DOCUMENT_URL', fileName ? { url, fileName } : { url });
    }

    /**
     * Ask the editor to close the current document/editor instance.
     */
    async closeEditor() {
      await this.waitForBridge();
      return this.postCommand('CLOSE_EDITOR');
    }

    /**
     * Reload the embedded iframe to a new editor URL.
     */
    reload(src = './') {
      this.iframe.src = src;
    }

    /**
     * Dispose message listeners and any pending bridge requests.
     */
    destroy() {
      global.removeEventListener('message', this.handleMessage);
      for (const pending of this.pendingResponses.values()) {
        global.clearTimeout(pending.timeoutId);
      }
      this.pendingResponses.clear();
      this.hostEventListeners.clear();
    }

    /**
     * Route postMessage traffic to either pending command promises or host event listeners.
     */
    handleMessage(event) {
      if (event.origin !== this.targetOrigin || event.source !== this.getEditorWindow() || typeof event.data !== 'string') {
        return;
      }

      let decoded;
      try {
        decoded = decodeMessage(event.data);
      } catch {
        return;
      }

      if (decoded?.type === 'HOST_EVENT' && decoded.payload?.event) {
        for (const listener of this.hostEventListeners) {
          listener(decoded.payload);
        }
        return;
      }

      if (!decoded?.isResponse || !decoded.id) {
        return;
      }

      const pending = this.pendingResponses.get(decoded.id);
      if (!pending) {
        return;
      }

      global.clearTimeout(pending.timeoutId);
      this.pendingResponses.delete(decoded.id);
      if (decoded.isError || decoded.payload?.ok === false) {
        pending.reject(new Error(decoded.payload?.error || 'Editor bridge command failed.'));
        return;
      }
      pending.resolve(decoded.payload);
    }
  }

  global.DocumentEditorHostBridge = {
    create(options) {
      return new DocumentEditorHostBridge(options);
    },
  };
})(window);
