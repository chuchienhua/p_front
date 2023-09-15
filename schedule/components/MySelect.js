import React from "react";
import PropTypes from "prop-types";
import Select from 'react-select';

const MySelect = props => {
  let options = [props.allOption, ...props.options]
  if (props.NoAllOption) {
    options = props.options
  }
  if (props.allowSelectAll) {

    return (
      <Select
        {...props}
        options={options}
        onChange={selected => {
          if (
            selected !== null &&
            selected.length > 0 &&
            selected[selected.length - 1].value === props.allOption.value
          ) {
            return props.onChange(props.options);
          }
          return props.onChange(selected);
        }}
        isDisabled={props.isDisabled}
      />
    );
  }

  return <Select {...props} />;
};

MySelect.propTypes = {
  options: PropTypes.array,
  value: PropTypes.any,
  onChange: PropTypes.func,
  allowSelectAll: PropTypes.bool,
  allOption: PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.string
  }),
  isDisabled: PropTypes.bool,
  placeholder: PropTypes.string,
  NoAllOption: PropTypes.bool,
};

MySelect.defaultProps = {
  allOption: {
    label: "全選",
    value: "*"
  }
};

export default MySelect;
