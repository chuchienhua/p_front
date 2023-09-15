const LOGIN_SUCCESS = "LOGIN_SUCCESS";
const LOGIN_FAILURE = "LOGIN_FAILURE";
const LOGOUT = "LOGOUT";

const initState = {
  user: undefined, //data: { COMPANY, FIRM, DEPT_NO, PPS_CODE, NAME, ss_exp, exp }
  token: undefined,
  authRoute: undefined,
  firm: undefined,
};

const userReducer = (state = initState, action) => {
  switch (action.type) {
    case LOGIN_SUCCESS:
      if (
        action.payload.user.COMPANY !== undefined &&
        action.payload.user.FIRM !== undefined &&
        action.payload.user.DEPT_NO !== undefined &&
        action.payload.user.PPS_CODE !== undefined &&
        action.payload.user.NAME !== undefined &&
        action.payload.user.ss_exp !== undefined &&
        action.payload.user.exp !== undefined &&
        action.payload.firm !== undefined
      ) {
        return {
          firm: action.payload.firm,
          user: {
            COMPANY: action.payload.user.COMPANY,
            FIRM: action.payload.user.FIRM,
            DEPT_NO: action.payload.user.DEPT_NO,
            PPS_CODE: action.payload.user.PPS_CODE,
            NAME: action.payload.user.NAME,
            ss_exp: action.payload.user.ss_exp,
            exp: action.payload.user.exp,
          },
          token: action.payload.token,
          authRoute: action.payload.authRoutes,
        };
      }
      return {
        firm: undefined,
        user: undefined,
        token: undefined,
        authRoute: undefined,
      };
    case LOGIN_FAILURE:
      return {
        firm: undefined,
        user: undefined,
        token: undefined,
        authRoute: undefined,
      };
    case LOGOUT:
      return {
        firm: undefined,
        user: undefined,
        token: undefined,
        authRoute: undefined,
      };
    default:
      return state;
  }
};

export default userReducer;
