import React from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import raf from 'raf';

class Lazyload extends React.Component {

  static propTypes = {
    /** A html img tag for lazyload */
    children: PropTypes.node.isRequired,

    /** Img url placeholder */
    lazy: PropTypes.string,

    /** Callback when img loaded */
    onVisible: PropTypes.func,

    /** If img scroll in a div, you can pass container node */
    context: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.func,
    ]),
  }

  constructor(props) {
    super(props);
    this.state = {
			visible: false,
			isImgLoaded: false
    };
    this._context = props.context || window;
    this.onScroll = this.onScroll.bind(this);
    this.checkInView = this.checkInView.bind(this);
  }

  componentDidMount() {
    setTimeout(() => {
      this.init();
    }, 0);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.children !== nextProps.children) {
      this.update();
    }
  }

  componentWillUnmount() {
    this.removeBinding();
    this._isUnmount = true;
  }

  init() {
    const { children } = this.props;
    const context = this.getContext();

    if (children.type !== 'img') {
      console.error('Lazyload component only accepts one img children.');
    }

    context.addEventListener('scroll', this.onScroll);
    context.addEventListener('resize', this.onScroll);
    this.onScroll();
  }

  removeBinding() {
    const context = this.getContext();
    if (!context) return;
    context.removeEventListener('scroll', this.onScroll);
    context.removeEventListener('resize', this.onScroll);
  }

  update() {
    this.setState({ visible: false });
    this.removeBinding();
    this.init();
  }

  getContext() {
    return (typeof this._context === 'function')
      ? this._context()
      : this._context;
  }

  onScroll() {
    if (!this._ticking) {
      this._ticking = true;
      raf(this.checkInView);
    }
  }

  loadImage() {
    const img = new Image();
    const src = this.props.children.props.src;

    img.onload = function () {
      if (this._isUnmount) return;

			this.setState(() => ({isImgLoaded: true}));
			this.setState(() => ({visible: true}));

    }.bind(this);

    img.onerror = function () {
      if (this._isUnmount) return;

      this.setState({ visible: true });
      console.warn(`Can\'t load image: ${src}`);
    }.bind(this);

    img.src = src;
  }

  checkInView() {
    if (this._isUnmount) return;

    const { onVisible } = this.props;
    const scrollTop = window.pageYOffset;
    const bounds = findDOMNode(this).getBoundingClientRect();
    const top = bounds.top + scrollTop;
    const height = bounds.bottom - bounds.top;

    if (
      top === 0 ||
      (top <= (scrollTop + window.innerHeight) && (top + height) > (scrollTop))
    ) {
      this.loadImage();
      this.removeBinding();
      if (typeof onVisible === 'function') {
        onVisible();
      }
    }

    this._ticking = false;

  }

  render() {
    const { lazy, children } = this.props;
    let imageUrl = lazy;
    const styles = {
      opacity: imageUrl ? 1 : 0,
      transition: "opacity 0.3s ease-out"
		};
		
		if (this.state.isImgLoaded && !this.state.visible) {
			styles.opacity = 0;
		}

    if (this.state.visible) {
      imageUrl = children.props.src;
      styles.opacity = 1;
    }

    return React.cloneElement(children, {
      style: styles,
      src: imageUrl
    });

  }
}

export default Lazyload;