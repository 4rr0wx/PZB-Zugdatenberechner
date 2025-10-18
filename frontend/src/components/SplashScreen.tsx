interface SplashScreenProps {
  isReady: boolean;
}

const SplashScreen = ({ isReady }: SplashScreenProps) => {
  return (
    <div className={`splash${isReady ? " splash--fadeout" : ""}`}>
      <div className="splash__content">
        <div className="splash__scene" aria-hidden="true">
          <div className="splash__smoke">
            <span />
            <span />
            <span />
          </div>
          <div className="splash__track splash__track--back" />
          <div className="splash__track splash__track--front" />
          <div className="splash__train">
            <div className="splash__engine">
              <div className="splash__engine-stack" />
              <div className="splash__engine-body">
                <div className="splash__engine-cabin">
                  <span className="splash__window" />
                </div>
                <div className="splash__engine-boiler">
                  <div className="splash__engine-light" />
                </div>
              </div>
              <div className="splash__engine-wheels">
                <span />
                <span className="splash__rod" />
                <span />
              </div>
            </div>
            <div className="splash__connector" />
            <div className="splash__carriage">
              <div className="splash__carriage-body">
                <span className="splash__window" />
                <span className="splash__window" />
                <span className="splash__window" />
              </div>
              <div className="splash__carriage-wheels">
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
        <div className="splash__title">PZB Zudatenberechner</div>
        <div className="splash__subtitle">Zugdaten werden geladen …</div>
      </div>
    </div>
  );
};

export default SplashScreen;
