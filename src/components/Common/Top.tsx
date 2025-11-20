import "./Top.scss";
import icon from "../../assets/logo.png";
const Top = () => {
    return (
        <div className="top-container">
            <a href="/">
                <img className="icon-content" src={icon} alt="" />
                <span className="text-content">
                    Link
                </span>
            </a>
        </div>
    )
};

export default Top;