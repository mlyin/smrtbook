function Card(props) {
    return (
        <><div className="col d-flex justify-content-center">
			<img className="card-img-top" src="../public/logo192.png" alt="Card cap" />
            <div className="card">
                <div className="card-body">
                    <span> {props.date} </span>
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">Sample text</p>
                    <a href="/#" className="btn btn-primary">Read more</a>
                </div>
                <ul className="list-group list-group-flush">
                    <li className="list-group-item">Cras justo odio</li>
                    <li className="list-group-item">Dapibus ac facilisis in</li>
                    <li className="list-group-item">Vestibulum at eros</li>
                </ul>
            </div>
	    </div></>
    );
}

export default Card;