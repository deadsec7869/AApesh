import React from 'react';

/** Owns visuals only: a fallback must never change playback intent. */
export class VisualStageBoundary extends React.Component<React.PropsWithChildren, { failed: boolean; lost: boolean; revision: number }> {
  state = { failed: false, lost: false, revision: 0 };
  private host = React.createRef<HTMLDivElement>();
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private retries = 0;
  static getDerivedStateFromError() { return { failed: true, lost: false }; }
  componentDidCatch(error: Error) { console.warn('Visual stage disabled; audio remains independent.', error); }
  private lost = (event: Event) => {
    event.preventDefault(); this.setState({ lost: true }); clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.setState({ failed: true, lost: false }), 5000);
  };
  private restored = () => { clearTimeout(this.timeout); this.setState({ lost: false }); };
  componentDidMount() {
    this.host.current?.addEventListener('webglcontextlost', this.lost, true);
    this.host.current?.addEventListener('webglcontextrestored', this.restored, true);
  }
  componentWillUnmount() {
    clearTimeout(this.timeout);
    this.host.current?.removeEventListener('webglcontextlost', this.lost, true);
    this.host.current?.removeEventListener('webglcontextrestored', this.restored, true);
  }
  render() {
    return <div ref={this.host} className="visual-stage-boundary">
      {!this.state.failed && <React.Fragment key={this.state.revision}>{this.props.children}</React.Fragment>}
      {(this.state.failed || this.state.lost) && <div className="visual-stage-fallback" role="status">
        <span>{this.state.lost ? 'Restoring visuals…' : 'Artwork mode · Visual stage unavailable'}</span>
        {this.state.failed && this.retries < 2 && <button onClick={() => { this.retries++; this.setState(state => ({ failed: false, lost: false, revision: state.revision + 1 })); }}>Retry visuals</button>}
      </div>}
    </div>;
  }
}
