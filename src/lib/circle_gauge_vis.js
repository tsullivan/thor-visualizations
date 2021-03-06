import React, { Component } from 'react';
import $ from './flot';
import ResizeAware from 'react-resize-aware';
import _ from 'lodash';
import { findDOMNode } from 'react-dom';
import reactcss from 'reactcss';

export default React.createClass({

  getInitialState() {
    return { scale: 1, top: 0, left: 0, translateX: 1, translateY: 1 };
  },

  getDefaultProps() {
    return { innerLine: 2, gaugeLine: 10 };
  },

  calculateCorrdinates() {
    const inner = findDOMNode(this.refs.inner);
    const resize = findDOMNode(this.refs.resize);
    let scale = this.state.scale;

    // Let's start by scaling to the largest dimension
    if (resize.clientWidth - resize.clientHeight < 0) {
      scale = resize.clientWidth / inner.clientWidth;
    } else {
      scale = resize.clientHeight / inner.clientHeight;
    }
    let [ newWidth, newHeight ] = this.calcDimensions(inner, scale);

    // Now we need to check to see if it will still fit
    if (newWidth > resize.clientWidth) {
      scale = resize.clientWidth / inner.clientWidth;
    }
    if (newHeight > resize.clientHeight) {
      scale = resize.clientHeight / inner.clientHeight;
    }

    // Calculate the final dimensions
    [ newWidth, newHeight ] = this.calcDimensions(inner, scale);

    // Because scale is middle out we need to translate
    // the new X,Y corrdinates
    const translateX = (newWidth - inner.clientWidth) / 2;
    const translateY = (newHeight - inner.clientHeight) / 2;

    // Center up and down
    const top = Math.floor((resize.clientHeight - newHeight) / 2);
    const left = Math.floor((resize.clientWidth - newWidth) / 2);

    return { scale, top, left, translateY, translateX };
  },

  componentDidMount() {
    const resize = findDOMNode(this.refs.resize);
    if (!resize) return;
    resize.addEventListener('resize', this.handleResize);
    this.handleResize();
  },

  componentWillUnmount() {
    const resize = findDOMNode(this.refs.resize);
    if (!resize) return;
    resize.removeEventListener('resize', this.handleResize);
  },

  // When the component updates it might need to be resized so we need to
  // recalculate the corrdinates and only update if things changed a little. THis
  // happens when the number is too wide or you add a new series.
  componentDidUpdate() {
    const newState = this.calculateCorrdinates();
    if (newState && !_.isEqual(newState, this.state)) {
      this.setState(newState);
    };
  },

  calcDimensions(el, scale) {
    const newWidth = Math.floor(el.clientWidth * scale);
    const newHeight = Math.floor(el.clientHeight * scale);
    return [newWidth, newHeight];
  },

  handleResize() {
    // Bingo!
    const newState = this.calculateCorrdinates();
    newState && this.setState(newState);
  },
  render() {
    const { value, max, color, reversed } = this.props;
    const { scale, translateX, translateY, top, left} = this.state;
    const size = 2 * Math.PI * 50;
    const sliceSize = 1;
    const percent = value < max ? value / max : 1;
    const styles = reactcss({
      default: {
        circle: {
          r: 50,
          cx: 60,
          cy: 60,
          fill: 'rgba(0,0,0,0)',
          stroke: color,
          strokeWidth: this.props.gaugeLine,
          strokeDasharray: `${(percent * sliceSize) * size} ${size}`,
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%'
        },
        circleBackground: {
          r: 50,
          cx: 60,
          cy: 60,
          fill: 'rgba(0,0,0,0)',
          stroke: 'rgba(0,0,0,0.2)',
          strokeDasharray: `${sliceSize * size} ${size}`,
          strokeWidth: this.props.innerLine,
          // transform: 'rotate(116deg)',
          transformOrigin: '50% 50%'
        },
        resize: {
          position: 'relative',
          display: 'flex',
          rowDirection: 'column',
          flex: '1 0 auto'
        },
        svg: {
          position: 'absolute',
          width: 120.72,
          height: 120.72,
          top: this.state.top,
          left: this.state.left,
          transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`
        }
      },
      reversed: {
        circleBackground: {
          stroke: 'rgba(255,255,255,0.2)',
        },
      }
    }, this.props);
    if (this.props.innerColor) {
      styles.circleBackground.stroke = this.props.innerColor;
    }
    return (
      <ResizeAware ref="resize" style={styles.resize}>
        <svg ref="inner" style={styles.svg}>
          <circle style={styles.circleBackground}/>
          <circle style={styles.circle}/>
        </svg>
      </ResizeAware>
    );
  }

});
