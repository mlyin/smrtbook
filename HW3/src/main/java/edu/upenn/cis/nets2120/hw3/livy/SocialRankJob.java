package edu.upenn.cis.nets2120.hw3.livy;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.livy.Job;
import org.apache.livy.JobContext;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.util.DoubleAccumulator;

import edu.upenn.cis.nets2120.config.Config;
import edu.upenn.cis.nets2120.storage.SparkConnector;
import scala.Tuple2;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

public class SocialRankJob implements Job<List<MyPair<String, HashMap<Integer, Double>>>> {
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	
	JavaSparkContext context;
	

	/**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 * @throws DynamoDbException 
	 */
	public void initialize() throws IOException, InterruptedException {
		System.out.println("Connecting to Spark...");
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		
		System.out.println("Connected!");
	}
	

	/**
	 * Main functionality in the program: read and process the social network.
	 * More specifically, this method will load the social network, add backlinks
	 * as needed, and then create RDDs ultimately to run the socialrank algorithm
	 * on the loaded dataset, ultimately printing and returning the top 10.
	 * 
	 * @throws IOException File read, network, and other errors
	 * @throws DynamoDbException DynamoDB is unhappy with something
	 * @throws InterruptedException User presses Ctrl-C
	 */
	public List<MyPair<String, HashMap<Integer, Double>>> run() throws IOException, InterruptedException {
		System.out.println("Running");

		//we get to go through and change every user id to username, every category id to category name,
		//and every article can stay as is

		// create the RDD of user friendships
		JavaRDD<String> inter = context.textFile("s3://adsorptionfiles/friends");
		// the below calculations will create an RDD of friend edges and their
		// corresponding weights
		JavaPairRDD<String, String> inter2 = inter
				.mapToPair(l -> new Tuple2<>(l.split(" ", 2)[0], l.split(" ", 2)[1]))
				.distinct();
		JavaPairRDD<String, Integer> counts = inter2.groupByKey().mapToPair(p -> {
			int sz = 0;
			Iterator<String> it = p._2().iterator();
			while (it.hasNext()) {
				sz++;
				it.next();
			}
			return new Tuple2<>(p._1, sz);
		});
		JavaPairRDD<String, Tuple2<String, Integer>> joint = inter2.join(counts);
		String user = "user";
		JavaPairRDD<String, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> friends = joint.mapToPair(tup -> {
			return new Tuple2<>(tup._1,
					new Tuple2<>(tup._2()._1(), new Tuple2<>(0.3 / tup._2._2, new Tuple2<>(user, user))));
		}).distinct();

		// onto user likes article
		JavaRDD<String> loaded = context.textFile("s3://adsorptionfiles/userlikesarticle");
		JavaPairRDD<String, Integer> userToArticle = loaded
				.mapToPair(l -> new Tuple2<>(l.split(" ", 2)[0], Integer.parseInt(l.split(" ", 2)[1])));
		JavaPairRDD<Integer, String> articletoUser = userToArticle.mapToPair(tup -> new Tuple2<>(tup._2, tup._1));
		JavaPairRDD<String, Integer> uaCnt = userToArticle.groupByKey().mapToPair(tup -> {
			Iterator<Integer> it = tup._2.iterator();
			int sz = 0;
			while (it.hasNext()) {
				sz++;
				it.next();
			}
			return new Tuple2<>(tup._1, sz);
		}).distinct();
		JavaPairRDD<Integer, Integer> auCnt = articletoUser.groupByKey().mapToPair(tup -> {
			Iterator<String> it = tup._2.iterator();
			int sz = 0;
			while (it.hasNext()) {
				sz++;
				it.next();
			}
			return new Tuple2<>(tup._1, sz);
		}).distinct();
		JavaPairRDD<String, Tuple2<Integer, Tuple2<Double, Tuple2<String, String>>>> uaWeights = userToArticle
				.join(uaCnt).mapToPair(tup -> {
					return new Tuple2<>(tup._1,
							new Tuple2<>(tup._2._1, new Tuple2<>(0.4 / tup._2._2, new Tuple2<>("user", "article"))));
				}).distinct();
		JavaPairRDD<Integer, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> auWeights = articletoUser
				.join(auCnt).mapToPair(tup -> {
					return new Tuple2<>(tup._1,
							new Tuple2<>(tup._2._1, new Tuple2<>((double) tup._2._2, new Tuple2<>("article", "user"))));
				}).distinct();

		// so far friendships and user -> article edges are correct
		// let's do user category next

		loaded = context.textFile("s3://adsorptionfiles/interests");
		JavaPairRDD<String, String> userToCategory = loaded
				.mapToPair(l -> new Tuple2<>(l.split(" ", 2)[0], l.split(" ", 2)[1]));
		JavaPairRDD<String, String> categoryToUser = userToCategory.mapToPair(tup -> new Tuple2<>(tup._2, tup._1));
		JavaPairRDD<String, Integer> ucCnt = userToCategory.groupByKey().mapToPair(tup -> {
			Iterator<String> it = tup._2.iterator();
			int sz = 0;
			while (it.hasNext()) {
				sz++;
				it.next();
			}
			return new Tuple2<>(tup._1, sz);
		}).distinct();
		JavaPairRDD<String, Integer> cuCnt = categoryToUser.groupByKey().mapToPair(tup -> {
			Iterator<String> it = tup._2.iterator();
			int sz = 0;
			while (it.hasNext()) {
				sz++;
				it.next();
			}
			return new Tuple2<>(tup._1, sz);
		}).distinct();
		JavaPairRDD<String, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> ucWeights = userToCategory
				.join(ucCnt).mapToPair(tup -> {
					return new Tuple2<>(tup._1,
							new Tuple2<>(tup._2._1, new Tuple2<>(0.3 / tup._2._2, new Tuple2<>("user", "category"))));
				}).distinct();
		JavaPairRDD<String, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> cuWeights = categoryToUser
				.join(cuCnt).mapToPair(tup -> {
					return new Tuple2<>(tup._1,
							new Tuple2<>(tup._2._1,
									new Tuple2<>((double) tup._2._2, new Tuple2<>("category", "user"))));
				}).distinct();

		// uc, uu, ua all work correctly now
		// article category is the last thing that needs to be uploaded
		loaded = context.textFile("s3://adsorptionfiles/article_categories");
		JavaPairRDD<Integer, String> articleToCategory = loaded
				.mapToPair(l -> new Tuple2<>(Integer.parseInt(l.split(" ", 2)[0]), l.split(" ", 2)[1]));
		JavaPairRDD<String, Integer> categoryToArticle = articleToCategory
				.mapToPair(tup -> new Tuple2<>(tup._2, tup._1));
		JavaPairRDD<Integer, Integer> acCnt = articleToCategory.groupByKey().mapToPair(tup -> {
			Iterator<String> it = tup._2.iterator();
			int sz = 0;
			while (it.hasNext()) {
				sz++;
				it.next();
			}
			return new Tuple2<>(tup._1, sz);
		}).distinct();
		JavaPairRDD<String, Integer> caCnt = categoryToArticle.groupByKey().mapToPair(tup -> {
			Iterator<Integer> it = tup._2.iterator();
			int sz = 0;
			while (it.hasNext()) {
				sz++;
				it.next();
			}
			return new Tuple2<>(tup._1, sz);
		}).distinct();
		JavaPairRDD<Integer, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> acWeights = articleToCategory
				.join(acCnt).mapToPair(tup -> {
					return new Tuple2<>(tup._1,
							new Tuple2<>(tup._2._1,
									new Tuple2<>((double) tup._2._2, new Tuple2<>("article", "category"))));
				}).distinct();
		// acWeights.foreach(s -> System.out.println(s));
		// System.exit(0);
		JavaPairRDD<String, Tuple2<Integer, Tuple2<Double, Tuple2<String, String>>>> caWeights = categoryToArticle
				.join(caCnt).mapToPair(tup -> {
					return new Tuple2<>(tup._1,
							new Tuple2<>(tup._2._1,
									new Tuple2<>((double) tup._2._2, new Tuple2<>("category", "article"))));
				}).distinct();
		// caWeights.foreach(s -> System.out.println(s));
		// System.exit(0);

		// we have acWeights, caWeights, cu weights, au weights that need to be merged,
		// currently just storing integer values
		JavaPairRDD<Integer, Double> combinedArticleCounts = acWeights.cogroup(auWeights).mapToPair(tup -> {
			double cnt = 0;
			int fstsize = 0;
			int sndsize = 0;
			if (tup._2._1() != null) {
				for (Object o : tup._2._1())
					fstsize++;
			}
			if (tup._2._2() != null) {
				for (Object o : tup._2._2())
					sndsize++;
			}
			if (fstsize == 0) {
				return new Tuple2<>(tup._1, tup._2._2().iterator().next()._2._1());
			} else if (sndsize == 0) {
				return new Tuple2<>(tup._1, tup._2._1().iterator().next()._2._1());
			} else {
				return new Tuple2<>(tup._1(),
						tup._2._1().iterator().next()._2._1() + tup._2._2().iterator().next()._2._1());
			}
		}).distinct();
		// combinedArticleCounts.foreach(s -> System.out.println(s));
		// System.exit(0);
		JavaPairRDD<String, Double> combinedCategoryCounts = caWeights.cogroup(cuWeights).mapToPair(tup -> {
			double cnt = 0;
			int fstsize = 0;
			int sndsize = 0;
			for (Object o : tup._2._1)
				fstsize++;
			for (Object o : tup._2._2)
				sndsize++;
			if (fstsize == 0) {
				return new Tuple2<>(tup._1, tup._2._2().iterator().next()._2._1());
			} else if (sndsize == 0) {
				return new Tuple2<>(tup._1, tup._2._1().iterator().next()._2._1());
			} else {
				return new Tuple2<>(tup._1(),
						tup._2._1().iterator().next()._2._1() + tup._2._2().iterator().next()._2._1());
			}
		}).distinct();
		JavaPairRDD<Integer, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> articleToCategoryWeights = acWeights
				.join(combinedArticleCounts).mapToPair(t -> {
					return new Tuple2<>(t._1, new Tuple2<>(t._2._1._1, new Tuple2<>(1 / t._2()._2(), t._2._1._2._2)));
				}).distinct();
		JavaPairRDD<Integer, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> articleToUserWeights = auWeights
				.join(combinedArticleCounts).mapToPair(t -> {
					return new Tuple2<>(t._1, new Tuple2<>(t._2._1._1, new Tuple2<>(1 / t._2()._2(), t._2._1._2._2)));
				}).distinct();
		JavaPairRDD<String, Tuple2<Integer, Tuple2<Double, Tuple2<String, String>>>> categoryToArticleWeights = caWeights
				.join(combinedCategoryCounts).mapToPair(t -> {
					return new Tuple2<>(t._1, new Tuple2<>(t._2._1._1, new Tuple2<>(1 / t._2()._2(), t._2._1._2._2)));
				}).distinct();
		JavaPairRDD<String, Tuple2<String, Tuple2<Double, Tuple2<String, String>>>> categoryToUserWeights = cuWeights
				.join(combinedCategoryCounts).mapToPair(t -> {
					return new Tuple2<>(t._1, new Tuple2<>(t._2._1._1, new Tuple2<>(1 / t._2()._2(), t._2._1._2._2)));
				}).distinct();
		// categoryToUserWeights.foreach(s -> System.out.println(s));

		// our RDDs are category to article, category to user, article to user, article
		// to category
		// also user to user, user to category, user to article
		// now we have the data loaded - what comes next
		// we need to create the transfer RDD thing
		// the edge weights are nice, if we maintain a current RDD of each weight, its
		// very easy to transfer the weights - will normalize after
		// rdd wi

		// we will maintain a list of RDDs for each type of node representing the
		// current weights those nodes have

		JavaPairRDD<Integer, HashMap<String, Double>> articleWeights = articleToCategoryWeights.groupByKey()
				.mapToPair(tup -> new Tuple2<>(tup._1(), new HashMap<>()));
		JavaPairRDD<String, HashMap<String, Double>> userWeights = userToCategory.groupByKey()
				.mapToPair(tup -> new Tuple2<>(tup._1(), new HashMap<>()));
		JavaPairRDD<String, HashMap<String, Double>> categoryWeights = categoryToArticle.groupByKey()
				.mapToPair(tup -> new Tuple2<>(tup._1(), new HashMap<>()));

		userWeights = userWeights.mapToPair(tup -> {
			tup._2().put(tup._1(), 1.0);
			return new Tuple2<>(tup._1(), tup._2());
		});

		final int MAX_ITERATIONS = 15;

		System.out.println("Starting iterations");

		for (int i = 0; i < MAX_ITERATIONS; i++) {
			// we are joining the article -> user edge weights and the node weights
			// on the common source node. We want to create an RDD that tells us how
			// much of each value to transfer along each edge

			// tup._1 is the source, tup._2._1._1 is the destination
			// tup._2._1._2._1 is the edge weight
			// tup._2._2 is the existing list of weights

			// following the 7 transfer RDDs that
			JavaPairRDD<Integer, Tuple2<String, HashMap<String, Double>>> transferArticleToUser = articleToUserWeights
					.join(articleWeights).mapToPair(tup -> {
						double weight = tup._2._1._2._1();
						HashMap<String, Double> HashMap = new HashMap<>(tup._2._2);
						HashMap.replaceAll((k, v) -> v * weight);
						// List<Tuple2<Integer, Double>> toTransfer = tup._2()._2().stream()
						// .HashMap(e -> new Tuple2<>(e._1, e._2 * weight)).collect(Collectors.toList());
						return new Tuple2<>(tup._1(), new Tuple2<>(tup._2()._1()._1(), HashMap));
					});


			JavaPairRDD<Integer, Tuple2<String, HashMap<String, Double>>> transferArticleToCategory = articleToCategoryWeights
					.join(articleWeights)
					.mapToPair(tup -> {
						double weight = tup._2._1._2._1();
						HashMap<String, Double> HashMap = new HashMap<>(tup._2._2);
						HashMap.replaceAll((k, v) -> v * weight);
						// List<Tuple2<Integer, Double>> toTransfer = tup._2()._2().stream()
						// .HashMap(e -> new Tuple2<>(e._1, e._2 * weight)).collect(Collectors.toList());
						return new Tuple2<>(tup._1(), new Tuple2<>(tup._2()._1()._1(), HashMap));
					});

			JavaPairRDD<String, Tuple2<String, HashMap<String, Double>>> transferCategoryToUser = categoryToUserWeights
					.join(categoryWeights)
					.mapToPair(tup -> {
						double weight = tup._2._1._2._1();
						HashMap<String, Double> HashMap = new HashMap<>(tup._2._2);
						HashMap.replaceAll((k, v) -> v * weight);
						// List<Tuple2<Integer, Double>> toTransfer = tup._2()._2().stream()
						// .HashMap(e -> new Tuple2<>(e._1, e._2 * weight)).collect(Collectors.toList());
						return new Tuple2<>(tup._1(), new Tuple2<>(tup._2()._1()._1(), HashMap));
					});

			JavaPairRDD<String, Tuple2<Integer, HashMap<String, Double>>> transferCategoryToArticle = categoryToArticleWeights
					.join(categoryWeights)
					.mapToPair(tup -> {
						double weight = tup._2._1._2._1();
						HashMap<String, Double> HashMap = new HashMap<>(tup._2._2);
						HashMap.replaceAll((k, v) -> v * weight);
						// List<Tuple2<Integer, Double>> toTransfer = tup._2()._2().stream()
						// .HashMap(e -> new Tuple2<>(e._1, e._2 * weight)).collect(Collectors.toList());
						return new Tuple2<>(tup._1(), new Tuple2<>(tup._2()._1()._1(), HashMap));
					});

			JavaPairRDD<String, Tuple2<Integer, HashMap<String, Double>>> transferUserToArticle = uaWeights
					.join(userWeights)
					.mapToPair(tup -> {
						double weight = tup._2._1._2._1();
						HashMap<String, Double> HashMap = new HashMap<>(tup._2._2);
						HashMap.replaceAll((k, v) -> v * weight);
						// List<Tuple2<Integer, Double>> toTransfer = tup._2()._2().stream()
						// .HashMap(e -> new Tuple2<>(e._1, e._2 * weight)).collect(Collectors.toList());
						return new Tuple2<>(tup._1(), new Tuple2<>(tup._2()._1()._1(), HashMap));
					});

			JavaPairRDD<String, Tuple2<String, HashMap<String, Double>>> transferUserToCategory = ucWeights
					.join(userWeights)
					.mapToPair(tup -> {
						double weight = tup._2._1._2._1();
						HashMap<String, Double> HashMap = new HashMap<>(tup._2._2);
						HashMap.replaceAll((k, v) -> v * weight);
						// List<Tuple2<Integer, Double>> toTransfer = tup._2()._2().stream()
						// .HashMap(e -> new Tuple2<>(e._1, e._2 * weight)).collect(Collectors.toList());
						return new Tuple2<>(tup._1(), new Tuple2<>(tup._2()._1()._1(), HashMap));
					});

			JavaPairRDD<String, Tuple2<String, HashMap<String, Double>>> transferUserToUser = friends.join(userWeights)
					.mapToPair(tup -> {
						double weight = tup._2._1._2._1();
						HashMap<String, Double> HashMap = new HashMap<>(tup._2._2);
						HashMap.replaceAll((k, v) -> v * weight);
						// List<Tuple2<Integer, Double>> toTransfer = tup._2()._2().stream()
						// .HashMap(e -> new Tuple2<>(e._1, e._2 * weight)).collect(Collectors.toList());
						return new Tuple2<>(tup._1(), new Tuple2<>(tup._2()._1()._1(), HashMap));
					});

			//transferUserToUser.foreach(s -> System.out.println(s));

			//should be correct to here

			// next, I need to restore the weights
			JavaPairRDD<String, HashMap<String, Double>> incomingUserFromUser = transferUserToUser
					.mapToPair(tup -> new Tuple2<>(tup._2()._1(), tup._2()._2()))
					.aggregateByKey(new HashMap<>(), (a, b) -> {
						b.keySet().forEach(e -> {
							if (a.containsKey(e))
								a.put(e, a.get(e) + b.get(e));
							else
								a.put(e, b.get(e));
						});
						return a;
					}, (a, b) -> {
						a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
						return b;
					});




			JavaPairRDD<String, HashMap<String, Double>> incomingUserFromCategory = transferCategoryToUser
					.mapToPair(tup -> new Tuple2<>(tup._2()._1(), tup._2()._2()))
					.aggregateByKey(new HashMap<>(), (a, b) -> {
						b.keySet().forEach(e -> {
							if (a.containsKey(e))
								a.put(e, a.get(e) + b.get(e));
							else
								a.put(e, b.get(e));
						});
						return a;
					}, (a, b) -> {
						a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
						return b;
					});

			JavaPairRDD<String, HashMap<String, Double>> incomingUserFromArticle = transferArticleToUser
					.mapToPair(tup -> new Tuple2<>(tup._2()._1(), tup._2()._2()))
					.aggregateByKey(new HashMap<>(), (a, b) -> {
						b.keySet().forEach(e -> {
							if (a.containsKey(e))
								a.put(e, a.get(e) + b.get(e));
							else
								a.put(e, b.get(e));
						});
						return a;
					}, (a, b) -> {
						a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
						return b;
					});

			JavaPairRDD<String, HashMap<String, Double>> incomingCategoryFromArticle = transferArticleToCategory
					.mapToPair(tup -> new Tuple2<>(tup._2()._1(), tup._2()._2()))
					.aggregateByKey(new HashMap<>(), (a, b) -> {
						b.keySet().forEach(e -> {
							if (a.containsKey(e))
								a.put(e, a.get(e) + b.get(e));
							else
								a.put(e, b.get(e));
						});
						return a;
					}, (a, b) -> {
						a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
						return b;
					});

			JavaPairRDD<String, HashMap<String, Double>> incomingCategoryFromUser = transferUserToCategory
					.mapToPair(tup -> new Tuple2<>(tup._2()._1(), tup._2()._2()))
					.aggregateByKey(new HashMap<>(), (a, b) -> {
						b.keySet().forEach(e -> {
							if (a.containsKey(e))
								a.put(e, a.get(e) + b.get(e));
							else
								a.put(e, b.get(e));
						});
						return a;
					}, (a, b) -> {
						a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
						return b;
					});
			// incomingCategoryFromUser.foreach(s -> System.out.println(s));
			// incomingCategoryFromArticle.foreach(s -> System.out.println(s));

			JavaPairRDD<Integer, HashMap<String, Double>> incomingArticleFromCategory = transferCategoryToArticle
					.mapToPair(tup -> new Tuple2<>(tup._2()._1(), tup._2()._2()))
					.aggregateByKey(new HashMap<>(), (a, b) -> {
						b.keySet().forEach(e -> {
							if (a.containsKey(e))
								a.put(e, a.get(e) + b.get(e));
							else
								a.put(e, b.get(e));
						});
						return a;
					}, (a, b) -> {
						a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
						return b;
					});

			JavaPairRDD<Integer, HashMap<String, Double>> incomingArticleFromUser = transferUserToArticle
					.mapToPair(tup -> new Tuple2<>(tup._2()._1(), tup._2()._2()))
					.aggregateByKey(new HashMap<>(), (a, b) -> {
						b.keySet().forEach(e -> {
							if (a.containsKey(e))
								a.put(e, a.get(e) + b.get(e));
							else
								a.put(e, b.get(e));
						});
						return a;
					}, (a, b) -> {
						a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
						return b;
					});

			JavaPairRDD<String, HashMap<String, Double>> newUserWeights = incomingUserFromUser
					.fullOuterJoin(incomingUserFromCategory)
					.mapToPair(tup -> {
						if (!tup._2()._1().isPresent()) {
							return new Tuple2<>(tup._1(), tup._2()._2().get());
						}
						if (!tup._2()._2().isPresent()) {
							return new Tuple2<>(tup._1(), tup._2()._1().get());
						}
						HashMap<String, Double> map = tup._2._2().get();
						tup._2()._1().get().forEach((k, v) -> map.merge(k, v, (v1, v2) -> v1 + v2));
						return new Tuple2<>(tup._1(), map);
					});
			
			
			newUserWeights = newUserWeights.fullOuterJoin(incomingUserFromArticle)
					.mapToPair(tup -> {
						if (!tup._2()._1().isPresent()) {
							HashMap<String, Double> map = new HashMap<>();
							tup._2._2().get().forEach((k, v) -> {
								if (v > 1e-6) map.put(k, v);
							});
							return new Tuple2<>(tup._1(), map);
						} 
						if (!tup._2()._2().isPresent()) {
							HashMap<String, Double> map = new HashMap<>();
							tup._2._1().get().forEach((k, v) -> {
								if (v > 1e-6) map.put(k, v);
							});
							return new Tuple2<>(tup._1(), map);
						}
						HashMap<String, Double> map = tup._2()._2().get();
						tup._2._1().get().forEach((k, v) -> map.merge(k, v, (v1, v2) -> v1 + v2));
						//map.entrySet().removeIf(e -> e.getValue() < 0.005);
						HashMap<String, Double> newMap = new HashMap<>();
						map.forEach((k, v) -> {
							if (v > 1e-6) newMap.put(k, v);
						});
						return new Tuple2<>(tup._1(), newMap);
					});

			JavaPairRDD<Integer, HashMap<String, Double>> newArticleWeights = incomingArticleFromCategory
					.fullOuterJoin(incomingArticleFromUser)
					.mapToPair(tup -> {
						if (!tup._2()._1().isPresent()) {
							HashMap<String, Double> map = new HashMap<>();
							tup._2._2().get().forEach((k, v) -> {
								if (v > 1e-6) map.put(k, v);
							});
							return new Tuple2<>(tup._1(), map);
						} 
						if (!tup._2()._2().isPresent()) {
							HashMap<String, Double> map = new HashMap<>();
							tup._2._1().get().forEach((k, v) -> {
								if (v > 1e-6) map.put(k, v);
							});
							return new Tuple2<>(tup._1(), map);
						}
						HashMap<String, Double> map = tup._2()._2().get();
						tup._2._1().get().forEach((k, v) -> map.merge(k, v, (v1, v2) -> v1 + v2));
						//map.entrySet().removeIf(e -> e.getValue() < 0.005);
						HashMap<String, Double> newMap = new HashMap<>();
						map.forEach((k, v) -> {
							if (v > 1e-6) newMap.put(k, v);
						});
						return new Tuple2<>(tup._1(), newMap);
					});

			JavaPairRDD<String, HashMap<String, Double>> newCategoryWeights = incomingCategoryFromArticle
					.fullOuterJoin(incomingCategoryFromUser)
					.mapToPair(tup -> {
						if (!tup._2()._1().isPresent()) {
							HashMap<String, Double> map = new HashMap<>();
							tup._2._2().get().forEach((k, v) -> {
								if (v > 1e-6) map.put(k, v);
							});
							return new Tuple2<>(tup._1(), map);
						} 
						if (!tup._2()._2().isPresent()) {
							HashMap<String, Double> map = new HashMap<>();
							tup._2._1().get().forEach((k, v) -> {
								if (v > 1e-6) map.put(k, v);
							});
							return new Tuple2<>(tup._1(), map);
						}
						HashMap<String, Double> map = tup._2()._2().get();
						tup._2._1().get().forEach((k, v) -> map.merge(k, v, (v1, v2) -> v1 + v2));
						//map.entrySet().removeIf(e -> e.getValue() < 0.005);
						HashMap<String, Double> newMap = new HashMap<>();
						map.forEach((k, v) -> {
							if (v > 1e-6) newMap.put(k, v);
						});
						return new Tuple2<>(tup._1(), newMap);
					});

			newUserWeights = newUserWeights.mapToPair(tup -> {
				HashMap<String, Double> HashMap = tup._2();
				HashMap.put(tup._1, 1.0);
				return new Tuple2<>(tup._1(), HashMap);
			}); // origin stays 1

			//System.exit(0);

			//HashMap<String, DoubleAccumulator> accs = new HashMap<>();
			//DoubleAccumulator[] accs = new DoubleAccumulator[(int) userWeights.count() + 1];
            //System.exit(0);
			//userWeights.foreach(s -> accs.put(s._1(), context.sc().doubleAccumulator()));

			//userWeights.foreach(s -> System.out.println(s));
			//System.exit(0);

			// get the total weight for each user

			//System.exit(0);

			//newUserWeights.foreach(tup -> {
			//	HashMap<String, Double> map = tup._2();
            //    map.forEach((k, v) -> accs.add(new Tuple2<>(k ,v)));
			//	//HashMap.forEach((k, v) -> accs.get(k).add(v));
			//});

			//newUserWeights.foreachPartition(iter -> {
			//	while (iter.hasNext()) {
			//		Tuple2<String, HashMap<String, Double>> entry = iter.next();
			//		accs.add(entry._2());
			//	}
			//});

			//new user weights is a rdd of user node to the weight map - we can aggregate 
			HashMap<String, Double> userTotals = newUserWeights.aggregate(new HashMap<>(), (a,b) -> {
				HashMap<String, Double> b2 = b._2();
				b2.forEach((k, v) -> a.merge(k, v, (v1, v2) -> v1 + v2));
				return a;
			}, (a,b) -> {
				b.forEach((k, v) -> a.merge(k, v, (v1, v2) -> v1 + v2));
				return a;
			});



			HashMap<String, Double> articleTotals = newArticleWeights.aggregate(new HashMap<>(), (a,b) -> {
				HashMap<String, Double> b2 = b._2();
				b2.forEach((k, v) -> a.merge(k, v, (v1, v2) -> v1 + v2));
				return a;
			}, (a,b) -> {
				b.forEach((k, v) -> a.merge(k, v, (v1, v2) -> v1 + v2));
				return a;
			});

			HashMap<String, Double> categoryTotals = newCategoryWeights.aggregate(new HashMap<>(), (a,b) -> {
				HashMap<String, Double> b2 = b._2();
				b2.forEach((k, v) -> a.merge(k, v, (v1, v2) -> v1 + v2));
				return a;
			}, (a,b) -> {
				b.forEach((k, v) -> a.merge(k, v, (v1, v2) -> v1 + v2));
				return a;
			});

			HashMap<String, Double> accumulated = userTotals;
			articleTotals.forEach((k, v) -> accumulated.merge(k, v, (v1, v2) -> v1 + v2));
			categoryTotals.forEach((k, v) -> accumulated.merge(k, v, (v1, v2) -> v1 + v2));


			//newArticleWeights.foreach(tup -> {
			//	HashMap<String, Double> map = tup._2();
            //    map.forEach((k ,v) -> accs.add(new Tuple2<>(k ,v)));
			//});

			//newCategoryWeights.foreach(tup -> {
			//	HashMap<String, Double> map = tup._2();
            //    map.forEach((k ,v) -> accs.add(new Tuple2<>(k ,v)));
			//});


			HashMap<String, Double> normalizationFactors = new HashMap<>();
			//double[] normalizationFactors = new double[accs.length];
			accumulated.forEach((k, v) -> normalizationFactors.put(k, 1 / v));
			//System.out.println(normalizationFactors);
			//for (int j = 0; j < normalizationFactors.length; j++) {
			//	normalizationFactors[j] = 1 / accs[j].sum();
			//}

			//newUserWeights.foreach(s -> System.out.println(s));
			//System.exit(0);

			newUserWeights = newUserWeights.mapToPair(tup -> {
				tup._2.replaceAll((k, v) -> normalizationFactors.get(k) * v);
				return new Tuple2<>(tup._1(), tup._2());
			});


			newArticleWeights = newArticleWeights.mapToPair(tup -> {
				tup._2.replaceAll((k, v) -> normalizationFactors.get(k) * v);
				return new Tuple2<>(tup._1(), tup._2());
			});


			newCategoryWeights = newCategoryWeights.mapToPair(tup -> {
				tup._2.replaceAll((k, v) -> normalizationFactors.get(k) * v);
				return new Tuple2<>(tup._1(), tup._2());
			});

			// we need to find total sum and then normalize, keeping in mind we can't write
			// to a collection
			// how are we gonna find the sum

			// incomingCategoryFromArticle.foreach(s-> System.out.println(s));
			// incomingCategoryFromUser.foreach(s->System.out.println(s));

			// now have to implement normalization, checking when we can stop iterating
			// let's check for convergence first - if the maximum change is <0.05 it's
			// probably safe
			// to say that the algorithm has converged. For this, we're gonna go through
			JavaPairRDD<String, Tuple2<Iterable<HashMap<String, Double>>, Iterable<HashMap<String, Double>>>> conUsers = userWeights
					.cogroup(newUserWeights);

			DoubleAccumulator difUsers = context.sc().doubleAccumulator();
			conUsers.foreach(tup -> {
				HashMap<String, Double> a1 = new HashMap<>();
				HashMap<String, Double> a2 = new HashMap<>();
				if (tup._2._1().iterator().hasNext())
					a1 = tup._2()._1().iterator().next();
				if (tup._2._2().iterator().hasNext())
					a2 = tup._2()._2().iterator().next();
				for (HashMap.Entry<String, Double> entry : a1.entrySet()) {
					double maxDifUsers = Math.abs(entry.getValue() - a2.getOrDefault(entry.getKey(), 0.0));
					if (maxDifUsers > difUsers.value())
						difUsers.add(maxDifUsers);
				}
				for (HashMap.Entry<String, Double> entry : a2.entrySet()) {
					double maxDifUsers = Math.abs(entry.getValue() - a1.getOrDefault(entry.getKey(), 0.0));
					if (maxDifUsers > difUsers.value())
						difUsers.add(maxDifUsers);
				}
			});
			double maxDifUsers = difUsers.value();

			JavaPairRDD<Integer, Tuple2<Iterable<HashMap<String, Double>>, Iterable<HashMap<String, Double>>>> conArticles = articleWeights
					.cogroup(newArticleWeights);

			DoubleAccumulator difArticles = context.sc().doubleAccumulator();
			conArticles.foreach(tup -> {
				HashMap<String, Double> a1 = new HashMap<>();
				HashMap<String, Double> a2 = new HashMap<>();
				if (tup._2._1().iterator().hasNext())
					a1 = tup._2()._1().iterator().next();
				if (tup._2._2().iterator().hasNext())
					a2 = tup._2()._2().iterator().next();
				for (HashMap.Entry<String, Double> entry : a1.entrySet()) {
					double maxDifArticles = Math.abs(entry.getValue() - a2.getOrDefault(entry.getKey(), 0.0));
					if (maxDifArticles > difArticles.value())
						difArticles.add(maxDifArticles);
				}
				for (HashMap.Entry<String, Double> entry : a2.entrySet()) {
					double maxDifArticles = Math.abs(entry.getValue() - a1.getOrDefault(entry.getKey(), 0.0));
					if (maxDifArticles > difArticles.value())
						difArticles.add(maxDifArticles);
				}
			});
			double maxDifArticles = difArticles.value();

			JavaPairRDD<String, Tuple2<Iterable<HashMap<String, Double>>, Iterable<HashMap<String, Double>>>> conCategories = categoryWeights
					.cogroup(newCategoryWeights);

			DoubleAccumulator difCategories = context.sc().doubleAccumulator();
			conCategories.foreach(tup -> {
				HashMap<String, Double> a1 = new HashMap<>();
				HashMap<String, Double> a2 = new HashMap<>();
				if (tup._2._1().iterator().hasNext())
					a1 = tup._2()._1().iterator().next();
				if (tup._2._2().iterator().hasNext())
					a2 = tup._2()._2().iterator().next();
				for (HashMap.Entry<String, Double> entry : a1.entrySet()) {
					double maxDifCategories = Math.abs(entry.getValue() - a2.getOrDefault(entry.getKey(), 0.0));
					if (maxDifCategories > difCategories.value())
						difCategories.add(maxDifCategories);
				}
				for (HashMap.Entry<String, Double> entry : a2.entrySet()) {
					double maxDifCategories = Math.abs(entry.getValue() - a1.getOrDefault(entry.getKey(), 0.0));
					if (maxDifCategories > difCategories.value())
						difCategories.add(maxDifCategories);
				}
			});
			double maxDifCategories = difCategories.value();

			articleWeights = newArticleWeights;
			categoryWeights = newCategoryWeights;
			userWeights = newUserWeights;

			System.out.println("Finished iteration " + (i + 1));



			if (maxDifArticles < 0.01 && maxDifCategories < 0.01 && maxDifUsers < 0.01) {
				break;
			}

		}

		System.out.println("users");
		userWeights.foreach(s -> System.out.println(s));
		System.out.println("articles");
		articleWeights.foreach(s -> System.out.println(s));
		System.out.println("categories");
		categoryWeights.foreach(s -> System.out.println(s));

		JavaPairRDD<String, HashMap<Integer, Double>> userArticleWeights = articleWeights.flatMapToPair(tup -> {
			HashMap<String, Double> HashMap = tup._2();
			List<Tuple2<String, Tuple2<Integer, Double>>> lst = new ArrayList<>();
			HashMap.forEach((k, v) -> lst.add(new Tuple2<>(k, new Tuple2<>(tup._1(), v))));
			return lst.iterator();
		}).aggregateByKey(new HashMap<>(), (a, b) -> {
			if (a.containsKey(b._1())) a.put(b._1(), a.get(b._1()) + b._2());
			else a.put(b._1(), b._2());
			return a;
		}, (a,b) -> {
			a.forEach((k, v) -> b.merge(k, v, (v1, v2) -> v1 + v2));
			return b;
		});

		// System.exit(0);
        System.out.println("*** Finished adsorption algorithm! ***");
		return userArticleWeights.collect().stream().map(x -> new MyPair<>(x._1(), x._2())).collect(Collectors.toList());
	}

	/**
	 * Graceful shutdown
	 */
	public void shutdown() {
		System.out.println("Shutting down");
	}
	
	public SocialRankJob(boolean useBacklinks, String source) {
		System.setProperty("file.encoding", "UTF-8");
		
	}

	@Override
	public List<MyPair<String, HashMap<Integer, Double>>> call(JobContext arg0) throws Exception {
		initialize();
		return run();
	}

}
