import _ from 'lodash';
import moment from 'moment';
import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import $ from './flot';
import eventBus from './events';
import ResizeAware from 'react-resize-aware';
import reactcss from 'reactcss';
import calculateBarWidth from './calculate_bar_width';
import colors from './colors';

const Chart = React.createClass({

  componentWillMount(props) {
  },

  shouldComponentUpdate(props) {
    if (!this.plot) return true;
    if (props.reversed !== this.props.reversed) {
      return true;
    }
    if (props.yaxes && this.props.yaxes) {
      // We need to rerender if the axis change
      const valuesChanged = props.yaxes.some((axis, i) => {
        return !_.isEqual(
          _.omitBy(axis, _.isFunction),
          _.omitBy(this.props.yaxes[i], _.isFunction)
        );
      });
      if (props.yaxes.length !== this.props.yaxes.length || valuesChanged) {
        return true;
      }
    }
    return false;
  },

  shutdownChart() {
    if (!this.plot) return;
    const { target } = this.refs;
    $(target).unbind('plothover', this.props.plothover);
    if (this.props.onMouseOver) $(target).on('plothover', this.handleMouseOver);
    if (this.props.onMouseLeave) $(target).on('mouseleave', this.handleMouseLeave);
    if (this.props.onBrush) $(target).off('plotselected', this.brushChart);
    this.plot.shutdown();
    if (this.props.onCrosshair) {
      $(target).off('plothover', this.handlePlotover);
      eventBus.off('thorPlotover', this.handleThorPlotover);
    }
  },

  componentWillUnmount() {
    this.shutdownChart();
    findDOMNode(this.refs.resize).removeEventListener('resize', this.handleResize);
  },

  filterByShow(show) {
    if (show) {
      return (metric) => {
        return show.some(id => _.startsWith(id, metric.id));
      };
    }
    return (metric) => true;
  },

  componentWillReceiveProps(newProps) {
    if (this.plot) {
      const { series, markings } = newProps;
      const options = this.plot.getOptions();
      _.set(options, 'series.bars.barWidth', calculateBarWidth(series));
      if (markings) _.set(options, 'grid.markings', markings);
      this.plot.setData(this.calculateData(series, newProps.show));
      this.plot.setupGrid();
      this.plot.draw();
    }
  },

  componentDidMount() {
    this.renderChart();
    findDOMNode(this.refs.resize).addEventListener('resize', this.handleResize);
  },

  componentDidUpdate() {
    this.shutdownChart();
    this.renderChart();
  },

  calculateData(data, show) {
    const series = [];
    return _(data)
      .filter(this.filterByShow(show))
      .map((set) => {
        if (_.isPlainObject(set)) {
          return set;
        }
        return {
          color: '#990000',
          data: set
        };
      }).reverse().value();
  },

  getOptions() {
    const yaxes = this.props.yaxes || [{}];

    const lineColor = this.props.reversed ? colors.lineColorReversed : colors.lineColor;
    const textColor = this.props.reversed ? colors.textColorReversed : colors.textColor;
    const valueColor = this.props.reversed ? colors.valueColorReversed : colors.valueColor;

    const opts = {
      legend: { show: false },
      yaxes: yaxes,
      yaxis: {
        color: lineColor,
        font: { color: textColor },
        tickFormatter: this.props.tickFormatter
      },
      xaxis: {
        color: lineColor,
        timezone: 'browser',
        mode: 'time',
        font: { color: textColor }
      },
      series: {
        shadowSize: 0
      },
      grid: {
        margin: 0,
        borderWidth: 1,
        borderColor: lineColor,
        hoverable: true,
        mouseActiveRadius: 200
      }
    };

    if (this.props.onBrush) {
      _.set(opts, 'selection', { mode: 'x', color: textColor });
    }
    _.set(opts, 'series.bars.barWidth', calculateBarWidth(this.props.series));
    return _.assign(opts, this.props.options);
  },

  renderChart() {
    const { min, max } = this.props;
    const type = this.props.type || 'line';
    const { target} = this.refs;
    const { series } = this.props;
    const parent = $(target.parentElement);
    const data = this.calculateData(series, this.props.show);

    this.plot = $.plot(target, data, this.getOptions());

    this.handleResize = (e) => {
      if (!this.plot) return;
      this.plot.resize();
      this.plot.setupGrid();
      this.plot.draw();
    };

    this.handleResize();

    this.handleMouseOver = (...args) => {
      if (this.props.onMouseOver) this.props.onMouseOver(...args, this.plot);
    };

    this.handleMouseLeave = (...args) => {
      if (this.props.onMouseLeave) this.props.onMouseLeave(...args, this.plot);
      if (this.props.onCrosshair) this.props.onCrosshair();
    };

    $(target).on('plothover', this.handleMouseOver);
    $(target).on('mouseleave', this.handleMouseLeave);

    if (this.props.onCrosshair) {

      this.handlePlotover = (e, pos, item) => {
        eventBus.trigger('thorPlotover', [pos, item, this.plot]);
      };
      $(target).on('plothover', this.handlePlotover);

      this.handleThorPlotover = (e, pos, item, originalPlot) => {
        if (this.plot !== originalPlot) {
          this.props.onCrosshair(pos, item, this.plot, originalPlot);
        }
      };
      eventBus.on('thorPlotover', this.handleThorPlotover);
    }

    if (_.isFunction(this.props.plothover)) {
      $(target).bind('plothover', this.props.plothover);
    }

    $(target).on('mouseleave', (e) => {
      eventBus.trigger('rhythmPlotLeave');
    });

    if (_.isFunction(this.props.onBrush)) {
      this.brushChart = (e, ranges) => {
        this.props.onBrush(ranges);
        this.plot.clearSelection();
      };
      $(target).on('plotselected', this.brushChart);
    }

    this.state = {
      crosshair: { x: null, y: null }
    };

  },

  render() {
    const style = {
      position: 'relative',
      display: 'flex',
      rowDirection: 'column',
      flex: '1 0 auto'
    };
    return (
      <ResizeAware ref="resize" style={style}>
        <div ref="target" style={style}/>
      </ResizeAware>);
  }

});

export default React.createClass({

  getInitialState() {
    return { show: false };
  },

  calculateLeftRight(item, plot) {
    const el = this.refs.container;
    const offset = plot.offset();
    const canvas = plot.getCanvas();
    const point = plot.pointOffset({ x: item.datapoint[0], y: item.datapoint[1]});
    const edge = (point.left + 10) / canvas.width;
    let right;
    let left;
    if (edge > 0.5) {
      right = canvas.width - point.left;
      left = null;
    } else {
      right = null;
      left = point.left;
    }
    return [left, right];
  },

  handleMouseOver(e, pos, item, plot) {
    if (item) {
      const plotOffset = plot.getPlotOffset();
      const point = plot.pointOffset({ x: item.datapoint[0], y: item.datapoint[1]});
      const [left, right ] = this.calculateLeftRight(item, plot);
      const top = point.top;
      this.setState({
        show: true,
        item,
        left,
        right,
        crosshairRight: right,
        crosshairLeft: left,
        top: top + 10,
        bottom: plotOffset.bottom
      });
    }
  },

  handleCrosshair(pos, item, plot) {
    if (item) {
      const series = this.props.series[0];
      const [left, right] = this.calculateLeftRight(item, plot);
      this.setState({
        showCrosshair: true,
        crosshairLeft: left,
        crosshairRight: right
      });
    } else {
      this.setState({ showCrosshair: false });
    }
  },

  handleMouseLeave(e, plot) {
    this.setState({ show: false });
  },

  render() {
    const { item, right, top, left, crosshairLeft, crosshairRight } = this.state;
    const { series } = this.props;
    let tooltip;
    let crosshair;

    const showCrosshair = this.state.showCrosshair || this.state.show;

    const styles = reactcss({
      showCrosshair: {
        crosshair: {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: crosshairLeft,
          right: crosshairRight,
          width: '2px',
          backgroundColor: this.props.reversed ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          zIndex: 500001
        },
      },
      show: {
        tooltipContainer: {
          position: 'absolute',
          top: top - 26,
          left,
          right,
          zIndex: 50000,
          display: 'flex',
          alignItems: 'center'
        },
        tooltip: {
          backgroundColor: this.props.reversed ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          color: this.props.reversed ? 'black' : 'white',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px'
        },
        rightCaret: {
          display: right ? 'block' : 'none',
          color: this.props.reversed ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
        },
        leftCaret: {
          display: left ? 'block' : 'none',
          color: this.props.reversed ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
        },
        date: {
          color: this.props.reversed ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          lineHeight: '12px'
        },
        items: {
          display: 'flex',
          alignItems: 'center'
        },
        text: {
          whiteSpace: 'nowrap',
          fontSize: '12px',
          lineHeight: '12px',
          marginRight: 5
        },
        icon: {
          marginRight: 5
        },
        value: {
          fontSize: '12px',
          flexShrink: 0,
          lineHeight: '12px',
          marginLeft: 5
        }
      },
      hide: {
        tooltipContainer: { display: 'none' },
      },
      hideCrosshair: {
        crosshair: { display: 'none' }
      }
    }, { show: this.state.show, hide: !this.state.show, showCrosshair, hideCrosshair: !showCrosshair });

    if (item) {
      const metric = series.find(r => r.id === item.series.id);
      const formatter = metric && metric.tickFormatter || this.props.tickFormatter || ((v) => v);
      const value = item.datapoint[2] ? item.datapoint[1] - item.datapoint[2] : item.datapoint[1];
      const caretClassName = right ? 'fa fa-caret-right' : 'fa-caret-left';
      tooltip = (
        <div style={styles.tooltipContainer}>
          <i className="fa fa-caret-left" style={styles.leftCaret}></i>
          <div style={styles.tooltip}>
            <div style={styles.items}>
              <div style={styles.icon}>
                <i className="fa fa-circle" style={{ color: item.series.color }}></i>
              </div>
              <div style={styles.text}>{ item.series.label }</div>
              <div style={styles.value}>{ formatter(value) }</div>
            </div>
            <div style={styles.date}>{ moment(item.datapoint[0]).format('lll') }</div>
          </div>
          <i className="fa fa-caret-right" style={styles.rightCaret}></i>
        </div>
      );

    }

    crosshair = (
      <div style={styles.crosshair}></div>
    );

    const container = {
      display: 'flex',
      rowDirection: 'column',
      flex: '1 0 auto',
      position: 'relative'
    };


    const params = {
      onMouseLeave: this.handleMouseLeave,
      onMouseOver: this.handleMouseOver,
      ...this.props
    };

    if (this.props.crosshair) {
      params.onCrosshair = this.handleCrosshair;
    }

    return (
      <div ref="container" style={container}>
        { tooltip }
        { crosshair }
        <Chart {...params}/>
      </div>
    );
  }
});
